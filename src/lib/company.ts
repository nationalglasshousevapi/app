export type CompanyDetails = {
  name: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankIfsc: string;
};

// These are the details shown on the supplied National Glass House invoice.
// Environment variables still take priority, so they can be changed per deployment.
const DEFAULT_COMPANY: CompanyDetails = {
  name: "National Glass House",
  address: "Shop No. 7, Deep Shopping Center, B/H DCB Bank, Vapi, Gujarat - 396191",
  phone: "+91 98241 10798",
  email: "nationalglasshouse2017@gmail.com",
  gst: "24CDDPK0867R1Z2",
  bankName: "Axis Bank, Chala, Vapi",
  bankAccountName: "NATIONAL GLASS HOUSE",
  bankAccountNo: "917020056641652",
  bankIfsc: "UTIB0002570",
};

function configured(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export const DEFAULT_HSN_CODE = "7005";

export function defaultHsnCode(): string {
  return process.env.DEFAULT_HSN_CODE?.trim() || DEFAULT_HSN_CODE;
}

export function companyDetails(): CompanyDetails {
  return {
    name: configured("COMPANY_NAME", DEFAULT_COMPANY.name),
    address: configured("COMPANY_ADDRESS", DEFAULT_COMPANY.address),
    phone: configured("COMPANY_PHONE", DEFAULT_COMPANY.phone),
    email: configured("COMPANY_EMAIL", DEFAULT_COMPANY.email),
    gst: configured("COMPANY_GST", DEFAULT_COMPANY.gst),
    bankName: configured("COMPANY_BANK_NAME", DEFAULT_COMPANY.bankName),
    bankAccountName: configured("COMPANY_BANK_ACCOUNT_NAME", DEFAULT_COMPANY.bankAccountName),
    bankAccountNo: configured("COMPANY_BANK_ACCOUNT_NO", DEFAULT_COMPANY.bankAccountNo),
    bankIfsc: configured("COMPANY_BANK_IFSC", DEFAULT_COMPANY.bankIfsc),
  };
}
