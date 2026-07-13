export interface TeamTimestamp {
  team_id: string;
  last_updated: string;
  submission_group: string;
}

export type TimestampData = TeamTimestamp;

class TimestampService {
  private static instance: TimestampService;
  private timestampData: Map<string, TeamTimestamp> = new Map();
  private dataLoaded = false;

  private constructor() {}

  static getInstance(): TimestampService {
    if (!TimestampService.instance) {
      TimestampService.instance = new TimestampService();
    }
    return TimestampService.instance;
  }

  async loadTimestampData(): Promise<void> {
    if (this.dataLoaded) return;

    try {
      // No timestamp data to load since the file was removed
      this.dataLoaded = true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }

  getTimestampForTeam(teamId: string): TeamTimestamp | null {
    return this.timestampData.get(teamId) || null;
  }

  mergeWithTeamData<T extends { id: string }>(teams: T[]): (T & { last_updated?: string; submission_group?: string })[] {
    return teams.map(team => {
      const timestampData = this.getTimestampForTeam(team.id);
      
      if (timestampData) {
        return {
          ...team,
          last_updated: timestampData.last_updated,
          submission_group: timestampData.submission_group
        };
      }
      
      return team;
    });
  }

  getSummaryStats(): {
    totalTeams: number;
    beforeDeadline: number;
    afterDeadline: number;
  } {
    const beforeDeadline = Array.from(this.timestampData.values())
      .filter(item => item.submission_group === 'Before Deadline').length;
    
    const afterDeadline = Array.from(this.timestampData.values())
      .filter(item => item.submission_group === 'After Deadline').length;

    return {
      totalTeams: this.timestampData.size,
      beforeDeadline,
      afterDeadline
    };
  }
}

export const timestampService = TimestampService.getInstance();
