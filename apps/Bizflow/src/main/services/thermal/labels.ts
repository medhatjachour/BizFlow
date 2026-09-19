/**
 * Receipt label catalogue shared by every receipt composer
 * (ESC/POS text layout, bitmap renderer and the PDF/preview helpers).
 */

export interface ReceiptLabels {
  tel: string
  taxNo: string
  commReg: string
  receiptNum: string
  date: string
  cashier: string
  customer: string
  phone: string
  deliveryAddress: string
  orderType: string
  table: string
  guests: string
  shift: string
  openedAt: string
  closedAt: string
  notes: string
  subtotal: string
  vat: string
  serviceCharge: string
  gratuity: string
  total: string
  payment: string
  discount: string
  afterDiscount: string
  fixedDiscount: string
  installmentPlan: string
  depositPaid: string
  remaining: string
  statusPaid: string
  statusOverdue: string
  thankYou: string
  appreciate: string
  item: string
  qty: string
  price: string
  totalCol: string
}

/**
 * Get receipt label strings in English or Arabic
 */
export function getReceiptLabels(lang: 'en' | 'ar'): ReceiptLabels {
  if (lang === 'ar') {
    return {
      tel: 'هاتف',
      taxNo: 'الرقم الضريبي',
      commReg: 'السجل التجاري',
      receiptNum: 'رقم الإيصال',
      date: 'التاريخ',
      cashier: 'الكاشير',
      customer: 'العميل',
      phone: 'الهاتف',
      deliveryAddress: 'العنوان',
      orderType: 'نوع الطلب',
      table: 'الطاولة',
      guests: 'عدد الافراد',
      shift: 'الوردية',
      openedAt: 'فتح الطلب',
      closedAt: 'اغلاق الطلب',
      notes: 'ملاحظات',
      subtotal: 'المجموع الفرعي',
      vat: 'ضريبة القيمة المضافة',
      serviceCharge: 'خدمة',
      gratuity: 'بقشيش',
      total: 'الاجمالي الكلي',
      payment: 'طريقة الدفع',
      discount: 'خصم',
      afterDiscount: 'بعد الخصم',
      fixedDiscount: 'خصم ثابت',
      installmentPlan: 'خطة الاقساط',
      depositPaid: 'الدفعة المقدمة',
      remaining: 'المتبقي',
      statusPaid: 'مدفوع',
      statusOverdue: 'متاخر',
      thankYou: 'شكرا لزيارتكم!',
      appreciate: 'نقدر تعاملكم معنا',
      item: 'الصنف',
      qty: 'ك',
      price: 'السعر',
      totalCol: 'الإجمالي',
    }
  }
  return {
    tel: 'Tel',
    taxNo: 'Tax No',
    commReg: 'Comm Reg',
    receiptNum: 'Receipt #',
    date: 'Date',
    cashier: 'Cashier',
    customer: 'Customer',
    phone: 'Phone',
    deliveryAddress: 'Address',
    orderType: 'Order Type',
    table: 'Table',
    guests: 'Guests',
    shift: 'Shift',
    openedAt: 'Opened At',
    closedAt: 'Closed At',
    notes: 'Notes',
    subtotal: 'Subtotal',
    vat: 'VAT',
    serviceCharge: 'Service',
    gratuity: 'Gratuity',
    total: 'TOTAL',
    payment: 'Payment',
    discount: 'Discount',
    afterDiscount: 'After Discount',
    fixedDiscount: 'Fixed Discount',
    installmentPlan: 'INSTALLMENT PLAN',
    depositPaid: 'Deposit Paid',
    remaining: 'Remaining',
    statusPaid: 'PAID',
    statusOverdue: 'OVERDUE',
    thankYou: 'Thank you for your visit!',
    appreciate: 'We appreciate your business',
    item: 'Item',
    qty: 'Qty',
    price: 'Price',
    totalCol: 'Total',
  }
}
