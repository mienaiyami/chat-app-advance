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
		<code className="rounded bg-accent p-1 text-accent-foreground text-sm">
			{children}
		</code>
	),
	pre: ({ children }) => (
		<pre className="w-full max-w-lg overflow-x-auto whitespace-pre rounded bg-accent p-1 text-accent-foreground">
			{children}
		</pre>
	),
	blockquote: ({ children }) => (
		<blockquote className="border-gray-500 border-l-4 pl-4 italic">
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
	ul: ({ children }) => <ul className="list-inside list-disc">{children}</ul>,
	ol: ({ children }) => (
		<ol className="list-inside list-decimal">{children}</ol>
	),
	li: ({ children }) => <li className="mb-1">{children}</li>,
	h1: ({ children }) => <h1 className="mb-2 font-bold text-2xl">{children}</h1>,
	h2: ({ children }) => <h2 className="mb-2 font-bold text-xl">{children}</h2>,
	h3: ({ children }) => <h3 className="mb-2 font-bold text-lg">{children}</h3>,
	h4: ({ children }) => (
		<h4 className="mb-2 font-bold text-base">{children}</h4>
	),
	h5: ({ children }) => <h5 className="mb-2 font-bold text-sm">{children}</h5>,
	h6: ({ children }) => <h6 className="mb-2 font-bold text-xs">{children}</h6>,
};
