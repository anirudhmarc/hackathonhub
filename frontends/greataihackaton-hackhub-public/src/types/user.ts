export interface UserData {
  teamName: string | null;
  problemId: string | null;
  hasSubmitted: boolean;
  track: 'student' | 'corporate' | null;
}