const ORDER_STATUS = {
  PENDING: "pending",
  PACKAGING: "packaging",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  ON_HOLD: "on_hold",
  SENT_TO_COURIER: "sent_to_courier",
  COURIER_IN_REVIEW: "courier_in_review",
  COURIER_PENDING: "courier_pending",
  COURIER_CANCELLED_RETURNED: "courier_cancelled_returned",
  PARTLY_DELIVERED: "partly_delivered",
  DELIVERED: "delivered",
  APPROVAL_PENDING_PAYMENT: "approval_pending_payment",
  INCOMPLETE: "incomplete",
};

const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

const COURIER_OPTIONS = ["Pathao", "Steadfast", "Redx", "Paperfly", "eCourier"];

const ORDER_SEARCHABLE_FIELDS = ["customerName", "customerPhone", "orderId", "ipAddress"];

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
  COURIER_OPTIONS,
  ORDER_SEARCHABLE_FIELDS,
};
