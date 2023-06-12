import { createServerSideHelpers } from '@trpc/react-query/server';
import { appRouter } from "~/server/api/root";
import {prisma} from "~/server/db";
import superjson from "superjson";


//This SSG helper lets us prefetch queries on the server. These helpers make tRPC call procedures directly on the server,
//without an TTP request, similar to server-side calls. 

export const generateSSGHelper = () => 
  createServerSideHelpers({
    router: appRouter,
    ctx: { prisma, userId: null },
    transformer: superjson, // optional - adds superjson serialization
  })