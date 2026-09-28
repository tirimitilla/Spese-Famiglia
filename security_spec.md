# Security Specification & Firestore Hardening Spec

## 1. Data Invariants

1. **Family Isolation (Master Gate)**:
   - All sub-collections under `/families/{familyId}` (members, expenses, incomes, stores, recurring_expenses, shopping_list) are strictly private.
   - A user can only read or write to `/families/{familyId}` and its subcollections if they are an authenticated member registered under `/families/{familyId}/members/` or if creating a new family as the creator.

2. **User Profile Confidentiality**:
   - `/users/{userId}` documents are strictly confidential and only readable/writable by the authenticated user whose `request.auth.uid == userId`.

3. **Identity & Immutability**:
   - In `/families/{familyId}/members/{memberId}`, the `userId` field must match `request.auth.uid` on self-join, or an existing admin of the family must perform member management.
   - For `/users/{userId}`, `incoming().id == request.auth.uid`.

4. **Input Size & Type Constraints**:
   - Every string field has strict maximum size limits (<= 100 or 200 chars).
   - Document ID path variables are strictly validated using `isValidId()`.
   - Numbers (e.g. quantity, amount, total) must be non-negative numeric types.

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Read**: Attempting to read `/families/fam123/expenses/exp1` without auth.
2. **Unauthenticated Write**: Attempting to write `/families/fam123/expenses/exp1` without auth.
3. **Cross-Family Snooping**: User A authenticated, attempting to list `/families/famB/expenses` where User A is not a member.
4. **Cross-Family Injection**: User A authenticated, attempting to insert an expense into `/families/famB/expenses/expEvil`.
5. **Ghost Field / Shadow Update**: Updating an expense with unexpected property `isVerifiedAdmin: true` or prototype poisoning.
6. **Negative Total Value Poisoning**: Creating an expense with negative amount `total: -500`.
7. **Identity Spoofing in User Profile**: Authenticated User A attempting to write `/users/userB` to overwrite User B's family assignment.
8. **Oversized String Buffer Denial of Wallet**: Writing an expense with `product` size of 2MB to exhaust bandwidth/quotas.
9. **Path Variable Traversal / ID Injection**: Attempting to access document with malformed ID `../../secrets/doc`.
10. **Orphaned Subcollection Write**: Inserting into `/families/nonexistent/expenses` where the family document does not exist.
11. **Unauthorized Family Admin Privilege Escalation**: Member updating their own role to `isAdmin: true` without existing admin status.
12. **Blanket Query Scraping**: Attempting to query all users across the system without specifying own UID.

## 3. Security Tests Spec

All above 12 scenarios must be rejected with PERMISSION_DENIED.
