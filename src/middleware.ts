import { authMiddleware } from "@clerk/nextjs";


export default authMiddleware({
  afterAuth(auth, req, evt) {

    console.log("Inside the middleware")

  },
});


export const config = {

  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],

};