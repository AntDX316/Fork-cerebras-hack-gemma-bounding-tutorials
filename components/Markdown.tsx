"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Lightweight markdown renderer for streamed model answers (no prose plugin). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground/80">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => <p className="whitespace-pre-wrap" {...props} />,
          a: (props) => (
            <a
              className="text-primary underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          ul: (props) => <ul className="ml-4 list-disc space-y-1" {...props} />,
          ol: (props) => <ol className="ml-4 list-decimal space-y-1" {...props} />,
          li: (props) => <li className="pl-0.5" {...props} />,
          strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          h1: (props) => <h3 className="mt-1 text-base font-semibold text-foreground" {...props} />,
          h2: (props) => <h3 className="mt-1 text-sm font-semibold text-foreground" {...props} />,
          h3: (props) => <h4 className="mt-1 text-sm font-semibold text-foreground" {...props} />,
          blockquote: (props) => (
            <blockquote className="border-l-2 border-border pl-3 text-muted-foreground" {...props} />
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = /\n/.test(String(children));
            if (isBlock) {
              return (
                <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
