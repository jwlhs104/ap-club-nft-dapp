import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import DataContextProvider from "../contexts/DataContext";
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  :root {
    --primary: white;
    --primary-text: #1a1a1a;
    --secondary: hsl(29, 100%, 56%);
    --secondary-text: #000000;
    --accent: #363636;
    --accent-text: #000000;
    --text-white: #ffffff;
    --color-text: rgb(196, 164, 83);
  }

`;

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, user-scalable=1"
        />
      </Head>

      <GlobalStyle />
      <DataContextProvider>
        <Component {...pageProps} />
      </DataContextProvider>
    </>
  );
}

export default MyApp;
