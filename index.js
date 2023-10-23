import fetch from "node-fetch";
import MarkdownIt from "markdown-it";
import fs from "fs";

const md = new MarkdownIt();

const fetchRawMarkdown = async (url) => {
  // Convert relative URLs to absolute URLs if necessary
  if (!url.startsWith("https://")) {
    url = `https://g0v.hackmd.io${url}/download`;
  } else {
    url = `${url}/download`;
  }

  const response = await fetch(url);
  const data = await response.text();
  return data;
};

const getAttendeesFromMarkdown = (rawMarkdown) => {
  const tokens = md.parse(rawMarkdown, {});
  const attendeeList = [];

  let found = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    const nextNextToken = tokens[i + 2];
    // console.log(token);
    if (token.type === "heading_open" && token.tag === "h2" && nextToken.type === 'inline' && nextToken?.content.includes("簽到") && nextNextToken?.type === "heading_close") {
      console.log('yoooooooooo');
      found = true;
      continue;
    }


    if (found && token.type === "bullet_list_open") {
      // loop till bullet_list_close token
      // add each inline content to attendeeList
      for (let j = i + 1; j < tokens.length; j++) {
        const listToken = tokens[j];
        if (listToken.type === "bullet_list_close") {
          return attendeeList;
        }

        if (listToken.type === "inline") {
          attendeeList.push(listToken.content);
        }
      }
    }
  }

  return attendeeList;
};

const slowdown = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const extractLinksFromTokens = (tokens) => {
  const links = [];

  for (const token of tokens) {
    if (token.type === "link_open") {
      links.push(token.attrs[0][1]);
    }

    if (token.children) {
      links.push(...extractLinksFromTokens(token.children));
    }
  }
  return links;
};

const findMostActiveAttendees = async (filename) => {
  const content = fs.readFileSync(filename, "utf8");

  const tokens = md.parse(content);

  const links = extractLinksFromTokens(tokens);

  const attendeeFrequency = {};
  for (const link of links) {
    await slowdown(800); // assuming a 500ms delay to handle rate limits
    console.log('link', link)
    const rawMarkdown = await fetchRawMarkdown(link);
    const attendees = getAttendeesFromMarkdown(rawMarkdown);
    console.log(attendees, 'attendees');
    attendees.forEach((attendee) => {
      attendeeFrequency[attendee] = (attendeeFrequency[attendee] || 0) + 1;
    });
  }

  // dump the attendeeFrequency object to a file
  fs.writeFileSync("attendeeFrequency.json", JSON.stringify(attendeeFrequency));
};

// Use this function to start the process
findMostActiveAttendees("links.md").then((result) => console.log(result));
