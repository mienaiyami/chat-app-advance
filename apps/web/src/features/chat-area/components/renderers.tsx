import ReactMarkdown, {
    type Components as MarkdownComponents,
} from "react-markdown";

// Markdown renderer components
export const renderers: MarkdownComponents = {
    p: ({ children }) => <p className="text-accent-foreground">{children}</p>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="font-sans italic">{children}</em>,
    s: ({ children }) => <s className="line-through">{children}</s>,
    code: ({ children }) => (
        <code className="bg-accent text-accent-foreground p-1 rounded text-sm">
            {children}
        </code>
    ),
    pre: ({ children }) => (
        <pre className="bg-accent text-accent-foreground p-1 rounded w-full max-w-lg whitespace-pre overflow-x-auto">
            {children}
        </pre>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-gray-500 pl-4 italic">
            {children}
        </blockquote>
    ),
    a: ({ href, children }) => (
        <a
            tabIndex={-1}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
        >
            {children}
        </a>
    ),
    img: ({ src, alt }) => (
        <img src={src} alt={alt} className="max-w-sm rounded-md" />
    ),
    ul: ({ children }) => <ul className="list-disc list-inside">{children}</ul>,
    ol: ({ children }) => (
        <ol className="list-decimal list-inside">{children}</ol>
    ),
    li: ({ children }) => <li className="mb-1">{children}</li>,
    h1: ({ children }) => (
        <h1 className="text-2xl font-bold mb-2">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-xl font-bold mb-2">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-lg font-bold mb-2">{children}</h3>
    ),
    h4: ({ children }) => (
        <h4 className="text-base font-bold mb-2">{children}</h4>
    ),
    h5: ({ children }) => (
        <h5 className="text-sm font-bold mb-2">{children}</h5>
    ),
    h6: ({ children }) => (
        <h6 className="text-xs font-bold mb-2">{children}</h6>
    ),
};
