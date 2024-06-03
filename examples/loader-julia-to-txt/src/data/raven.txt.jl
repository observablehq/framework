# Load Julia packages (must be installed)
using HTTP
using Gumbo
using TextAnalysis

# Text URL
url = "https://www.gutenberg.org/cache/epub/1065/pg1065.txt"

# Function to fetch text
function fetch_text_from_url(url::String)
  response = HTTP.get(url)
  text = String(response.body)
  text = replace(text, "\r" => "")
  return text
end

# Split into paragraphs
function split_into_paragraphs(text::String)
    paragraphs = split(text, "\n\n")
    return paragraphs
end

# Return a paragraph by number
function get_paragraph_by_number(text::String, paragraph_number::Int)
  paragraphs = split_into_paragraphs(text)
  return paragraphs[paragraph_number]
end

# Fetch text and access a paragraph by number
text = fetch_text_from_url(url)
paragraph_number = 29
result_paragraph = get_paragraph_by_number(text, paragraph_number)

# Return text to standard output
println(result_paragraph)
