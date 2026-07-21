/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
import { AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <>
      <Component />
    </>
  );
}
