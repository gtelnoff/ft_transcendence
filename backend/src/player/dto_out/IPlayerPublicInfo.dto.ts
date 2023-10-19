export interface IPlayerPublicInfo {
  id: number;
  login: string;
  username: string;
  two_factor_auth?: boolean;
  avatar_path: string;
  classic_elo: number;
  classic_wins: number;
  classic_losses: number;
  custom_elo: number;
  custom_wins: number;
  custom_losses: number;
  is_the_user: boolean;
}
