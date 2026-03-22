// app/index.tsx
import { Redirect } from "expo-router";
export default function Index() {
  // send root -> (tabs)
  return <Redirect href="/(tabs)" />;
}

