import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import {
  MAPVINA_CONFIG,
  MapVinaConfig,
} from 'src/config/mapvina/mapvina.config';
import {
  apiBadGateway,
  apiServiceUnavailable,
} from 'src/shared/helpers/api-i18n';

const REQUEST_TIMEOUT_MS = 5000;
const SUGGESTION_LIMIT = '6';

// MapVina v2 trả trạng thái trong body theo chuẩn Google; ZERO_RESULTS là thành công nhưng rỗng
const OK_STATUSES = new Set(['OK', 'ZERO_RESULTS']);

// Luôn lấy địa chỉ theo đơn vị hành chính mới (hai cấp tỉnh và phường, xã từ 7/2025)
const NEW_ADMIN = { new_admin: 'true' };

interface MapVinaComponent {
  long_name: string;
  types: string[];
}

interface MapVinaPrediction {
  place_id: string;
  description: string;
  name?: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
  terms?: { value: string }[];
}

interface MapVinaPlace {
  formatted_address?: string;
  name?: string;
  geometry?: { location?: { lat: number; lng: number } };
  address_components?: MapVinaComponent[];
}

interface MapVinaResponse {
  status?: string;
  error_message?: string;
}

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface ResolvedAddress {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  /** Số nhà và tên đường, nếu MapVina tách được */
  street: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
}

function toSuggestion(prediction: MapVinaPrediction): AddressSuggestion {
  const mainText =
    prediction.structured_formatting?.main_text ??
    prediction.name ??
    prediction.description;
  // secondary_text của MapVina lặp lại cả địa chỉ, nên ghép từ các phần sau tên chính
  const secondaryText =
    prediction.terms
      ?.slice(1)
      .map((term) => term.value)
      .join(', ') ?? '';

  return {
    placeId: prediction.place_id,
    description: prediction.description,
    mainText,
    secondaryText,
  };
}

function toResolvedAddress(
  place: MapVinaPlace | undefined,
): ResolvedAddress | null {
  const location = place?.geometry?.location;
  if (!place || !location) return null;

  const components = place.address_components ?? [];
  const find = (type: string) =>
    components.find((component) => component.types.includes(type))?.long_name ??
    null;

  // Địa chỉ mới có hai cấp: level_1 là tỉnh, level_2 là phường, xã.
  // Nếu có level_3 thì đó là địa chỉ cũ ba cấp: level_2 là quận, level_3 là phường.
  const level2 = find('administrative_area_level_2');
  const level3 = find('administrative_area_level_3');
  const street = [find('street_number'), find('route')]
    .filter(Boolean)
    .join(' ');

  return {
    latitude: location.lat,
    longitude: location.lng,
    formattedAddress: place.formatted_address ?? place.name ?? '',
    street: street || null,
    province: find('administrative_area_level_1'),
    district: level3 ? level2 : null,
    ward: level3 ?? level2,
  };
}

/**
 * Gọi REST API v2 của MapVina bằng API key nằm ở backend, để key không lộ ra trình duyệt.
 * MapVina nhận tọa độ theo thứ tự lat,lng.
 */
@Injectable()
export class GeocodingService {
  private readonly config: MapVinaConfig;

  constructor(
    config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(GeocodingService.name);
    this.config = config.getOrThrow<MapVinaConfig>(MAPVINA_CONFIG);
  }

  async autocomplete(
    input: string,
    near?: { latitude: number; longitude: number },
  ): Promise<AddressSuggestion[]> {
    const data = await this.request<{ predictions?: MapVinaPrediction[] }>(
      'place/autocomplete/json',
      {
        input,
        size: SUGGESTION_LIMIT,
        ...NEW_ADMIN,
        ...(near && { location: `${near.latitude},${near.longitude}` }),
      },
    );
    return (data.predictions ?? []).map(toSuggestion);
  }

  async placeDetail(placeId: string) {
    const data = await this.request<{ result?: MapVinaPlace }>(
      'place/details/json',
      { place_id: placeId, ...NEW_ADMIN },
    );
    return toResolvedAddress(data.result);
  }

  // Text Search hợp với địa chỉ đầy đủ người dùng vừa gõ, tốt hơn Autocomplete cho việc dời ghim
  async geocode(address: string) {
    const data = await this.request<{ results?: MapVinaPlace[] }>(
      'place/textsearch/json',
      { query: address, language: 'vi', ...NEW_ADMIN },
    );
    return toResolvedAddress(data.results?.[0]);
  }

  async reverse(latitude: number, longitude: number) {
    const data = await this.request<{ results?: MapVinaPlace[] }>(
      'geocode/json',
      { latlng: `${latitude},${longitude}`, size: '1', ...NEW_ADMIN },
    );
    return toResolvedAddress(data.results?.[0]);
  }

  private async request<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const { apiKey, baseUrl } = this.config;
    if (!apiKey) {
      apiServiceUnavailable('errors.geocoding.notConfigured');
    }

    const url = new URL(path, baseUrl);
    for (const [name, value] of Object.entries({ ...params, key: apiKey })) {
      url.searchParams.set(name, value);
    }

    // Không ghi URL vào log vì URL chứa API key
    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error({
        msg: 'geocoding.request.failed',
        path,
        error: error instanceof Error ? error.message : 'unknown',
      });
      apiBadGateway('errors.geocoding.upstreamFailed');
    }

    // MapVina trả 401 khi thiếu hoặc sai key
    if (!response.ok) {
      this.logger.error({
        msg: 'geocoding.request.rejected',
        path,
        status: response.status,
      });
      apiBadGateway('errors.geocoding.upstreamFailed');
    }

    const body = (await response.json()) as T & MapVinaResponse;
    if (body.status && !OK_STATUSES.has(body.status)) {
      this.logger.error({
        msg: 'geocoding.request.status',
        path,
        status: body.status,
        error: body.error_message,
      });
      apiBadGateway('errors.geocoding.upstreamFailed');
    }

    return body;
  }
}
