/** Categories of issue a user can report about a place. */
export type IssueType = 'closed' | 'wrong_kosher' | 'wrong_details' | 'other';

/** Payload submitted when a user reports wrong information. */
export interface NewIssueReport {
  placeId: string;
  type: IssueType;
  details?: string;
}

/** A stored report (as it would come back from the backend). */
export interface IssueReport extends NewIssueReport {
  id: string;
  createdAt: string; // ISO timestamp
}
