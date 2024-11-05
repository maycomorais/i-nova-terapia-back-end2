export interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  country?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  observations?: string;
}

export interface AsaasPayment {
  id?: string;
  customer: string;
  billingType: AsaasPaymentType;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  totalValue?: number;
  installmentValue?: number;
  discount?: {
    value: number;
    dueDateLimitDays: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value: number;
    type: 'PERCENTAGE';
  };
  fine?: {
    value: number;
    type: 'PERCENTAGE';
  };
  split?: AsaasSplit[];
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone?: string;
  };
  creditCardToken?: string;
}

export interface AsaasSplit {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
}

export type AsaasPaymentType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';

export interface AsaasBankAccount {
  id?: string;
  bank: {
    code: string;
    name?: string;
  };
  accountName: string;
  ownerName: string;
  ownerBirthDate?: string;
  cpfCnpj: string;
  type: 'CHECKING' | 'SAVINGS';
  agency: string;
  agencyDigit?: string;
  account: string;
  accountDigit: string;
}

export interface AsaasWebhook {
  event: string;
  payment: {
    id: string;
    customer: string;
    value: number;
    netValue: number;
    status: string;
    billingType: AsaasPaymentType;
    dueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installment?: number;
    invoiceUrl?: string;
    invoiceNumber?: string;
    externalReference?: string;
  };
}
