import React from "react";
import Wordmark from "./Wordmark";

interface Props {
  iconSize?: number;
  fontSize?: number;
}

export default function AppLogo({ fontSize = 28 }: Props) {
  return <Wordmark fontSize={fontSize} />;
}
