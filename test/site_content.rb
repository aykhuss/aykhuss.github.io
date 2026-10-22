# frozen_string_literal: true

# Build first, then run: bundle exec ruby test/site_content.rb [destination]
# To intentionally update the content baseline after editing the site:
#   bundle exec ruby test/site_content.rb --record [destination]
require "nokogiri"
require "json"
require "digest"
require "uri"
require "pathname"

record = ARGV.delete("--record")
destination = Pathname.new(ARGV.shift || "_site").expand_path
fixture = Pathname.new(__dir__).join("fixtures/site-content.json")
routes = %w[index.html publications/index.html talks/index.html teaching/index.html repositories/index.html cv/index.html]
documents = routes.to_h do |route|
  path = destination.join(route)
  abort "Missing page: #{path}" unless path.file?
  [route, Nokogiri::HTML(path.read)]
end
normalize = ->(text) { text.gsub(/\s+/, " ").strip }
digest = ->(value) { Digest::SHA256.hexdigest(JSON.generate(value)) }
snapshot = {}
%w[index.html talks/index.html teaching/index.html].each do |route|
  article = documents.fetch(route).at_css("article")
  abort "Missing article: #{route}" unless article
  snapshot[route] = {
    "text_sha256" => digest.call(normalize.call(article.text)),
    "links" => article.css("a[href]").map { |link| link["href"] }.uniq.sort
  }
end
publications = documents.fetch("publications/index.html").css(".bibliography .title").map { |title| normalize.call(title.text) }
snapshot["publications/index.html"] = {
  "count" => publications.length,
  "titles_sha256" => digest.call(publications)
}
if record
  fixture.dirname.mkpath
  fixture.write(JSON.pretty_generate(snapshot) + "\n")
  puts "Recorded content baseline from #{destination}. Review #{fixture} before committing."
  exit
end

failures = []
expected = JSON.parse(fixture.read)
expected.each do |route, baseline|
  failures << "Content changed: #{route}" unless snapshot[route] == baseline
end
navigation = %w[/ /publications/ /talks/ /teaching/ /repositories/ /cv/]
documents.each do |route, document|
  links = document.css("#navbar a.nav-link").map { |link| link["href"] }
  failures << "Navigation changed: #{route}: #{links.inspect}" unless links == navigation
  canonical = document.at_css('link[rel="canonical"]')&.[]("href")
  suffix = route == "index.html" ? "/" : "/#{route.delete_suffix('index.html')}"
  failures << "Wrong canonical URL: #{route}: #{canonical}" unless canonical == "https://aykhuss.github.io#{suffix}"
  document.css('script[src], link[rel="stylesheet"][href], img[src]').each do |asset|
    url = asset["src"] || asset["href"]
    next unless url.start_with?("/") && !url.start_with?("//")
    asset_path = destination.join(URI.decode_www_form_component(URI.parse(url).path.delete_prefix("/")))
    failures << "Missing local asset in #{route}: #{url}" unless asset_path.file?
  end
  failures << "Unexpected dark-mode toggle: #{route}" if document.at_css("#light-toggle")
end

social_urls = [
  "https://github.com/aykhuss", "https://orcid.org/0000-0002-7799-909X",
  "https://inspirehep.net/authors/1272381", "https://scholar.google.com/citations?user=BpXoXVMAAAAJ",
  "https://www.linkedin.com/in/alexander-huss-9a22265b"
]
home_links = documents.fetch("index.html").css("a[href]").map { |link| link["href"].delete_suffix("/") }
social_urls.each do |url|
  failures << "Missing social link: #{url}" unless home_links.include?(url)
end

resume = JSON.parse(File.read("assets/json/resume.json"))
cv_text = normalize.call(documents.fetch("cv/index.html").at_css("article").text)
cv_values = [resume.fetch("basics").fetch("name"), resume.fetch("basics").fetch("email")]
cv_values += resume.fetch("work").flat_map { |entry| entry.values_at("name", "position") }
cv_values += resume.fetch("education").flat_map { |entry| entry.values_at("institution", "studyType", "area") }
cv_values += resume.fetch("languages").flat_map { |entry| entry.values_at("language", "fluency") }
cv_values.compact.each do |value|
  failures << "Missing CV content: #{value}" unless cv_text.include?(value)
end

# Preserve date precision and contact presentation, not just the source values.
cv_article = documents.fetch("cv/index.html").at_css("article")
(resume.fetch("work") + resume.fetch("education")).each do |entry|
  format_date = ->(value) { value.to_s.empty? ? "Present" : value[0, 7].tr("-", ".") }
  dates = "#{format_date.call(entry.fetch('startDate'))} - #{format_date.call(entry.fetch('endDate'))}"
  failures << "Missing month-precision CV dates: #{dates}" unless cv_text.include?(dates)
end
email = resume.fetch("basics").fetch("email")
email_link = cv_article.css('a[href]').find { |link| link["href"] == "mailto:#{email}" }
failures << "CV email must be clickable" unless email_link && normalize.call(email_link.text) == email
address = resume.fetch("basics").fetch("location").fetch("address")
failures << "CV must not display the postal address" if cv_text.include?(address)

if failures.any?
  warn failures.uniq.join("\n")
  abort "Site preservation checks failed."
end
puts "Site preservation checks passed: #{routes.length} main pages, #{publications.length} publications, text, links, CV, navigation and local assets."
