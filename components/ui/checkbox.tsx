"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  // We need to track checked state for our custom indicator animation
  const isChecked =
    props.checked === true || props.checked === "indeterminate"

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input outline-none transition-all duration-200 ease-out group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isChecked && (
          <CheckboxPrimitive.Indicator
            forceMount
            data-slot="checkbox-indicator"
            className="grid place-content-center text-current [&>svg]:size-3.5"
            asChild
          >
            <motion.span
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 18,
                mass: 0.6,
              }}
            >
              {props.checked === "indeterminate" ? (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <motion.line
                    x1="2"
                    y1="5"
                    x2="8"
                    y2="5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                  />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <motion.path
                    d="M2.5 6.5L5 9L9.5 3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: {
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        delay: 0.05,
                      },
                      opacity: { duration: 0.05 },
                    }}
                  />
                </svg>
              )}
            </motion.span>
          </CheckboxPrimitive.Indicator>
        )}
      </AnimatePresence>

      {/* Ripple ring on check */}
      <AnimatePresence>
        {isChecked && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-[4px] border-2 border-primary"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
