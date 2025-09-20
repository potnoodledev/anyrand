"use client";

import type { TicketPurchaseFields } from "@/components/TicketPurchase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGameConfig } from "@/hooks/useGameConfig";
import { getRandomPicks } from "@/lib/random";
import { cn, isObjectEmpty } from "@/lib/utils";
import { ErrorMessage } from "@hookform/error-message";
import { DicesIcon, GiftIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
  Controller,
  useController,
  useFormState,
  type Control,
} from "react-hook-form";

export function NumberPicker({
  index,
  control,
  name,
  onRemove,
}: {
  index: number;
  control: Control<TicketPurchaseFields>;
  name: `tickets.${number}`;
  onRemove?: (index: number) => void;
}) {
  const [recipientVisible, setRecipientVisible] = useState(false);
  const { pickLength, maxBallValue } = useGameConfig();

  const { errors } = useFormState({ control, name });

  const {
    field: { onChange: setNumbers },
  } = useController({ name: `${name}.numbers`, control });

  return (
    <Card className={cn(!isObjectEmpty(errors) && "border-destructive")}>
      <CardHeader>
        <CardTitle>Ticket #{index + 1}</CardTitle>
      </CardHeader>
      <CardContent>
        <Controller
          control={control}
          name={`${name}.numbers`}
          render={({
            field: { value: numbers, name, onChange, onBlur },
            formState: { errors },
          }) => {
            const disabled = numbers.size === pickLength;

            return (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-start gap-2">
                  {[...Array(maxBallValue)].map((_, index) => {
                    const checked = numbers.has(index + 1);
                    return (
                      <label
                        key={index}
                        className="self-center justify-self-center"
                        htmlFor={`${name}.${index}`}
                      >
                        <input
                          type="checkbox"
                          id={`${name}.${index}`}
                          className="peer hidden"
                          disabled={!checked && disabled}
                          checked={checked}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              onChange(numbers.add(index + 1));
                            } else {
                              numbers.delete(index + 1);
                              onChange(numbers);
                            }
                          }}
                          onBlur={onBlur}
                        />
                        <div className="relative flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-input font-semibold peer-checked:border-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-checked:[&>*]:block">
                          {index + 1}
                          <span className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-4xl text-primary opacity-10">
                            ✗
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <ErrorMessage
                  as={<div className="text-sm text-destructive" />}
                  errors={errors}
                  name={name}
                />
              </div>
            );
          }}
        />
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setNumbers(getRandomPicks(pickLength, maxBallValue))}
            className="gap-2"
          >
            <DicesIcon size="1em" /> Randomize
          </Button>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setRecipientVisible(!recipientVisible)}
                    className="size-9"
                  >
                    <GiftIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select a wallet to receive this ticket</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!!onRemove && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => onRemove?.(index)}
                className="size-9"
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>
        </div>
        {recipientVisible && (
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Ticket recipient address"
              className="rounded-xl"
              {...control.register(`${name}.recipient`, {
                shouldUnregister: true,
              })}
            />

            <ErrorMessage
              as={<div className="text-sm text-destructive" />}
              errors={errors}
              name={`${name}.recipient`}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
