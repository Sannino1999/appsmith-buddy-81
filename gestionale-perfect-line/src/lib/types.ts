export type PaymentState='PAID'|'PARTIAL'|'UNPAID';
export type MembershipState='ACTIVE'|'EXPIRING'|'EXPIRED';
export type MemberRow={id:string;firstName:string;lastName:string;plan:string;endDate:string;paymentStatus:PaymentState;membershipStatus:MembershipState};