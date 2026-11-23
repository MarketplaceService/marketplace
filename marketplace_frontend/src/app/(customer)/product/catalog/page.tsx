import { AnonymousSessionProvider } from "@/components/auth/anonymous-session-provider";

const ProductCatalog = () => {
  return (
    <AnonymousSessionProvider>
      <div>Product</div>
    </AnonymousSessionProvider>
  );
};

export default ProductCatalog;
