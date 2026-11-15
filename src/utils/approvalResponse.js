// LOCATION: src/utils/approvalResponse.js
//
// R4 / R5: money-moving endpoints answer 200 (done) OR 202 (submitted for a second approver — NOTHING has changed yet). The UI must never tell the user
// something was completed when it is only pending. All adjustment screens use these helpers so the rule lives in one place.

export const PENDING_MESSAGE = 'Request submitted and awaiting approval.';

/** @returns {{pending:boolean, requestId:(number|null), status:string, duplicate:boolean, message:(string|null)}} */
export function interpretAdjustmentResponse(res) {
  const data = (res && res.data) || {};
  const pending = (res && res.status === 202) || data.pending_approval === true;
  return {
    pending,
    requestId: data.approval_request_id ?? null,
    status: data.status ?? (pending ? 'pending' : 'completed'),
    duplicate: data.duplicate === true,
    message: pending ? PENDING_MESSAGE : (data.message || null),
  };
}

/** Text shown for a pending submission: always the fixed sentence, plus the request id and status when the server returned them. */
export function pendingText(info) {
  const bits = [PENDING_MESSAGE];
  if (info.requestId) bits.push(`Request #${info.requestId} · status: ${info.status}.`);
  if (info.duplicate) bits.push('An identical request was already pending, so no new request was created.');
  return bits.join(' ');
}

/** Shows the right toast and returns the interpretation. `toast` is react-hot-toast's default export (callable, with .success/.error). */
export function notifyAdjustmentResult(toast, res, completedMessage) {
  const info = interpretAdjustmentResponse(res);
  if (info.pending) toast(pendingText(info), { icon: '⏳', duration: 7000 });
  else toast.success(info.message || completedMessage);
  return info;
}

/** One place that turns an axios error into a message the user can act on (validation, authorisation, conflict). */
export function adjustmentErrorMessage(err, fallback = 'The request failed.') {
  const status = err?.response?.status;
  const data = err?.response?.data || {};
  if (status === 403) return data.message || 'You are not authorised to do this.';
  if (status === 409) return data.message || 'This request conflicts with an earlier one (duplicate or reused request key).';
  if (status === 422) {
    const first = data.errors ? Object.values(data.errors).flat()[0] : null;
    return first || data.message || 'Validation failed.';
  }
  return data.message || fallback;
}
