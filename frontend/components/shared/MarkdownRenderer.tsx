'use client'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const formatText = (text: string) => {
    // Split by double newlines for paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim())
    
    return paragraphs.map((paragraph, pIndex) => {
      const trimmedParagraph = paragraph.trim()
      
      // Handle headers (## Header)
      if (trimmedParagraph.startsWith('##')) {
        const headerText = trimmedParagraph.replace(/^##\s*/, '')
        return (
          <h3 key={pIndex} className="text-xl font-bold text-white mt-6 mb-3">
            {formatInlineText(headerText)}
          </h3>
        )
      }
      
      // Handle headers (# Header)
      if (trimmedParagraph.startsWith('#')) {
        const headerText = trimmedParagraph.replace(/^#\s*/, '')
        return (
          <h2 key={pIndex} className="text-2xl font-bold text-white mt-6 mb-4">
            {formatInlineText(headerText)}
          </h2>
        )
      }
      
      // Handle bullet points (-, •, or *)
      if (trimmedParagraph.match(/^[-•*]\s/)) {
        const items = trimmedParagraph.split('\n').filter(line => line.trim())
        return (
          <ul key={pIndex} className="space-y-2 my-4 ml-2">
            {items.map((item, iIndex) => {
              const cleanItem = item.replace(/^[-•*]\s*/, '').trim()
              if (!cleanItem) return null
              return (
                <li key={iIndex} className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1 flex-shrink-0">•</span>
                  <span className="flex-1">{formatInlineText(cleanItem)}</span>
                </li>
              )
            })}
          </ul>
        )
      }
      
      // Handle numbered lists
      if (/^\d+\.\s/.test(trimmedParagraph)) {
        const items = trimmedParagraph.split('\n').filter(line => line.trim())
        return (
          <ol key={pIndex} className="space-y-2 my-4 ml-2">
            {items.map((item, iIndex) => {
              const match = item.match(/^\d+\.\s*(.+)/)
              if (!match) return null
              const cleanItem = match[1].trim()
              return (
                <li key={iIndex} className="flex items-start">
                  <span className="text-blue-400 mr-3 font-bold flex-shrink-0">{iIndex + 1}.</span>
                  <span className="flex-1">{formatInlineText(cleanItem)}</span>
                </li>
              )
            })}
          </ol>
        )
      }
      
      // Handle blockquotes (> text)
      if (trimmedParagraph.startsWith('>')) {
        const quoteText = trimmedParagraph.replace(/^>\s*/, '')
        return (
          <blockquote key={pIndex} className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-500/5 rounded-r-lg">
            <p className="text-gray-300 italic">{formatInlineText(quoteText)}</p>
          </blockquote>
        )
      }
      
      // Handle code blocks (```code```)
      if (trimmedParagraph.startsWith('```')) {
        const codeMatch = trimmedParagraph.match(/```(\w+)?\n?([\s\S]*?)```/)
        if (codeMatch) {
          const code = codeMatch[2].trim()
          return (
            <pre key={pIndex} className="bg-gray-900 border border-gray-700 rounded-lg p-4 my-4 overflow-x-auto">
              <code className="text-sm text-green-400 font-mono">{code}</code>
            </pre>
          )
        }
      }
      
      // Handle horizontal rules (---)
      if (trimmedParagraph === '---' || trimmedParagraph === '***') {
        return <hr key={pIndex} className="border-gray-700 my-6" />
      }
      
      // Regular paragraphs
      return (
        <p key={pIndex} className="mb-4 leading-relaxed">
          {formatInlineText(trimmedParagraph)}
        </p>
      )
    })
  }

  const formatInlineText = (text: string) => {
    const parts: React.ReactNode[] = []
    let currentIndex = 0
    
    // Combined regex for bold (**text**), italic (*text*), inline code (`code`), and links
    const inlineRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|\[([^\]]+)\]\(([^)]+)\)/g
    let match
    
    while ((match = inlineRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index))
      }
      
      if (match[1]) {
        // Bold: **text**
        parts.push(
          <strong key={match.index} className="font-bold text-white">
            {match[2]}
          </strong>
        )
      } else if (match[3]) {
        // Italic: *text*
        parts.push(
          <em key={match.index} className="italic text-gray-200">
            {match[4]}
          </em>
        )
      } else if (match[5]) {
        // Inline code: `code`
        parts.push(
          <code key={match.index} className="bg-gray-800 border border-gray-700 text-green-400 px-2 py-0.5 rounded text-sm font-mono">
            {match[6]}
          </code>
        )
      } else if (match[7]) {
        // Link: [text](url)
        parts.push(
          <a 
            key={match.index}
            href={match[8]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {match[7]}
          </a>
        )
      }
      
      currentIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex))
    }
    
    return parts.length > 0 ? parts : text
  }

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      {formatText(content)}
    </div>
  )
}