import { showSignInSheet } from '../components/PromptSheet';

/**
 * Guest gate (guideline 5.1.1(v)): browsing never requires an account;
 * account-backed actions open the branded sign-in sheet with a
 * per-action reason line.
 */
export function promptSignIn(reasonKey?: string): void {
  showSignInSheet(reasonKey);
}
