import { User } from "@clerk/nextjs/dist/server";

export const filterUserForClient = (user: User) => {
  return {
    id: user.id, 
    username: user.username, 
    profileImageUrl: user.profileImageUrl,
    externalUsername: user.externalAccounts[0]?.username
  };
};