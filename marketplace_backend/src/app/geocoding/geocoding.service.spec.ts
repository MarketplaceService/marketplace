import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

const API_KEY = 'test-key';

const makeService = (apiKey: string | null) =>
  new GeocodingService(
    {
      getOrThrow: () => ({
        apiKey,
        baseUrl: 'https://maps.mapvina.com/api/v2/',
      }),
    } as never,
    { setContext: jest.fn(), error: jest.fn() } as never,
  );

// Service luôn gọi fetch với một đối tượng URL
const calledUrl = (fetchMock: jest.SpiedFunction<typeof fetch>) =>
  new URL(fetchMock.mock.calls[0][0] as URL);

// Lấy theo dữ liệu thật MapVina trả về với new_admin=true: level_1 là tỉnh, level_2 là phường
const mapvinaPlace = {
  formatted_address: '142 Hoàng Quốc Việt, Phường Nghĩa Đô, Thành phố Hà Nội',
  name: '142 Hoàng Quốc Việt',
  geometry: { location: { lat: 21.046249, lng: 105.790847 } },
  address_components: [
    { long_name: '142', types: ['street_number'] },
    { long_name: 'Hoàng Quốc Việt', types: ['route'] },
    {
      long_name: 'Phường Nghĩa Đô',
      types: ['administrative_area_level_2', 'political'],
    },
    {
      long_name: 'Thành phố Hà Nội',
      types: ['administrative_area_level_1', 'political'],
    },
    { long_name: 'Việt Nam', types: ['country', 'political'] },
  ],
};

describe('GeocodingService (MapVina)', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('trả 503 và không gọi MapVina khi chưa cấu hình key', async () => {
    await expect(
      makeService(null).geocode('142 Hoàng Quốc Việt'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('trả 502 khi MapVina từ chối key (401)', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: 'Unauthorized' }, { status: 401 }),
    );

    await expect(
      makeService(API_KEY).geocode('142 Hoàng Quốc Việt'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('trả 502 khi trạng thái trong body không phải OK', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: 'INVALID_REQUEST', error_message: 'bad input' }),
    );

    await expect(
      makeService(API_KEY).placeDetail('place-1'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('trả 502 khi không kết nối được MapVina', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      makeService(API_KEY).reverse(21.0461, 105.7909),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('autocomplete gửi key, nội dung gõ, vị trí ưu tiên, địa giới mới và ghép dòng phụ từ terms', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        status: 'OK',
        predictions: [
          {
            place_id: '8:address:abc',
            description:
              '142 Hoàng Quốc Việt, Phường Nghĩa Đô, Thành phố Hà Nội',
            structured_formatting: {
              main_text: '142 Hoàng Quốc Việt',
              secondary_text:
                '142 Hoàng Quốc Việt, Phường Nghĩa Đô, Thành phố Hà Nội',
            },
            terms: [
              { value: '142 Hoàng Quốc Việt' },
              { value: 'Phường Nghĩa Đô' },
              { value: 'Thành phố Hà Nội' },
            ],
          },
          { place_id: '1:venue:xyz', description: 'Landmark 81' },
        ],
      }),
    );

    const suggestions = await makeService(API_KEY).autocomplete(
      '142 Hoàng Quốc Việt',
      { latitude: 21.03, longitude: 105.78 },
    );

    const url = calledUrl(fetchMock);
    expect(url.origin + url.pathname).toBe(
      'https://maps.mapvina.com/api/v2/place/autocomplete/json',
    );
    expect(url.searchParams.get('key')).toBe(API_KEY);
    expect(url.searchParams.get('input')).toBe('142 Hoàng Quốc Việt');
    expect(url.searchParams.get('location')).toBe('21.03,105.78');
    expect(url.searchParams.get('new_admin')).toBe('true');
    expect(suggestions).toEqual([
      {
        placeId: '8:address:abc',
        description: '142 Hoàng Quốc Việt, Phường Nghĩa Đô, Thành phố Hà Nội',
        mainText: '142 Hoàng Quốc Việt',
        secondaryText: 'Phường Nghĩa Đô, Thành phố Hà Nội',
      },
      {
        placeId: '1:venue:xyz',
        description: 'Landmark 81',
        mainText: 'Landmark 81',
        secondaryText: '',
      },
    ]);
  });

  it('place detail tách số nhà, tên đường, tỉnh và phường theo địa giới mới', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: 'OK', result: mapvinaPlace }),
    );

    const place = await makeService(API_KEY).placeDetail('8:address:abc');

    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/v2/place/details/json');
    expect(url.searchParams.get('place_id')).toBe('8:address:abc');
    expect(place).toEqual({
      latitude: 21.046249,
      longitude: 105.790847,
      formattedAddress:
        '142 Hoàng Quốc Việt, Phường Nghĩa Đô, Thành phố Hà Nội',
      street: '142 Hoàng Quốc Việt',
      province: 'Thành phố Hà Nội',
      district: null,
      ward: 'Phường Nghĩa Đô',
    });
  });

  it('địa chỉ cũ ba cấp: level_2 là quận, level_3 là phường', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        status: 'OK',
        results: [
          {
            ...mapvinaPlace,
            address_components: [
              {
                long_name: 'Phường Nghĩa Đô',
                types: ['administrative_area_level_3'],
              },
              {
                long_name: 'Quận Cầu Giấy',
                types: ['administrative_area_level_2'],
              },
              {
                long_name: 'Thành phố Hà Nội',
                types: ['administrative_area_level_1'],
              },
            ],
          },
        ],
      }),
    );

    await expect(
      makeService(API_KEY).geocode('142 Hoàng Quốc Việt, Cầu Giấy, Hà Nội'),
    ).resolves.toMatchObject({
      district: 'Quận Cầu Giấy',
      ward: 'Phường Nghĩa Đô',
      street: null,
    });
  });

  it('geocode dùng Text Search với địa chỉ đầy đủ', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: 'OK', results: [mapvinaPlace] }),
    );

    const place = await makeService(API_KEY).geocode(
      '142 Hoàng Quốc Việt, Phường Nghĩa Đô, Hà Nội',
    );

    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/v2/place/textsearch/json');
    expect(url.searchParams.get('query')).toBe(
      '142 Hoàng Quốc Việt, Phường Nghĩa Đô, Hà Nội',
    );
    expect(place?.latitude).toBe(21.046249);
  });

  it('reverse gửi tọa độ theo thứ tự lat,lng', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: 'OK', results: [mapvinaPlace] }),
    );

    const place = await makeService(API_KEY).reverse(21.0461, 105.7909);

    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/v2/geocode/json');
    expect(url.searchParams.get('latlng')).toBe('21.0461,105.7909');
    expect(place?.ward).toBe('Phường Nghĩa Đô');
  });

  it('trả null khi MapVina không tìm thấy kết quả', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: 'ZERO_RESULTS', results: [] }),
    );

    await expect(
      makeService(API_KEY).geocode('không có địa chỉ này'),
    ).resolves.toBeNull();
  });
});
