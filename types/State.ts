import type { Member } from "./Member.ts";
import type { Admin } from "./Admin.ts";

export interface State {
  isAdmin: boolean;
  /** Active administrator resolved from the revocable admin session. */
  admin: Admin | null;
  /** The logged-in member, resolved from the member session cookie by
   * routes/_middleware.ts. Null when nobody is logged in.
   *
   * Routes that act on behalf of a member must read their identity from here,
   * never from the request body — otherwise anyone could book, post a PR or
   * cancel a reservation as somebody else just by typing their email. */
  member: Member | null;
}
