import { getLogtoContext, signIn, signOut } from "@logto/next/server-actions";
import SignIn from "./sign-in";
import SignOut from "./sign-out";
import { logtoConfig } from "./logto";

async function Home() {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  return (
    <nav>
      {isAuthenticated ? (
        <p>
          Hello, {claims?.sub},
          <SignOut
            onSignOut={async () => {
              "use server";

              await signOut(logtoConfig);
            }}
          />
        </p>
      ) : (
        <p>
          <SignIn
            onSignIn={async () => {
              "use server";

              await signIn(logtoConfig);
            }}
          />
        </p>
      )}
    </nav>
  );
}

export default Home;
