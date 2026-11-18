// Client portal response types: aliases of the generated contract schemas (API @Route `out`).
import type { components } from "@/lib/api/schema";
type S = components["schemas"];

export type ApplicationSummaryResponse = S["ApplicationListResponse"]["applications"][number];
export type ApplicationDetailResponse = S["ClientApplicationDetail"];
export type ConversationListResponse = S["ChatConversationList"];
export type ConversationResponse = S["ChatConversation"];
export type MessageResponse = S["ChatMessage"];
export type MessageAttachmentResponse = S["ChatAttachUpload"];
export type MessagePageResponse = S["ChatMessagePage"];
export type InitiatePaymentResponse = S["InitiatePaymentResponse"];
export type PaymentStatusResponse = S["PaymentStatusResponse"];
export type PaymentReceiptResponse = S["PaymentReceiptResponse"];
