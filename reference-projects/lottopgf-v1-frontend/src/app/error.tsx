"use client";

import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Something went wrong!</CardTitle>
      </CardHeader>
      <CardFooter>
        <Button onClick={() => reset()}>Try again</Button>
      </CardFooter>
    </Card>
  );
}
