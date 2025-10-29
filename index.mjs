import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("HANDLER EVENT!!: ", event);
  

  const { rawPath, body } = event;

  const httpMethod = event.requestContext.http.method;

  if (httpMethod === "GET" && rawPath === "/notes") {
    const result = await docClient.send(
      new ScanCommand({ TableName: "Notes" })
    );

    return { statusCode: 200, body: JSON.stringify(result.Items) };
  }

  if (httpMethod === "POST" && rawPath === "/notes") {
    const note = JSON.parse(body);

    await docClient.send(new PutCommand({ TableName: "Notes", Item: note }));

    return { statusCode: 201, body: JSON.stringify(note) };
  }

  if (httpMethod === "GET" && rawPath.match(/^\/notes\/\w+/)) {
    const id = rawPath.split("/")[2];

    const result = await docClient.send(
      new GetCommand({ TableName: "Notes", Key: { id } })
    );

    return result.Item
      ? { statusCode: 200, body: JSON.stringify(result.Item) }
      : { statusCode: 404, body: JSON.stringify({ error: "Note not found" }) };
  }

  if (httpMethod === "DELETE" && rawPath.match(/^\/notes\/\w+/)) {
    const id = rawPath.split("/")[2];

    await docClient.send(
      new DeleteCommand({ TableName: "Notes", Key: { id } })
    );

    return {
      statusCode: 200,

      body: JSON.stringify({ message: "Note deleted" }),
    };
  }

  return {
    statusCode: 400,

    body: JSON.stringify({ error: "Unsupported route" }),
  };
};
