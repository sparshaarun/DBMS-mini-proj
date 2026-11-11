import MerchantNav from "./merchant-nav";

export default function MerchantLayout({ children }) {
  return (
    <>
      <MerchantNav />
      {children}
    </>
  );
}
