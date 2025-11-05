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
  console.log("HANDLER EVENT!!: ", JSON.stringify(event));
  const { rawPath, body } = event;
  const httpMethod = event.requestContext.http.method;

  const errorResponse = (error) => {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "There was an error",
        error: error.message,
      }),
    };
  };

  if (httpMethod === "GET" && rawPath === "/notes") {
    try {
      const result = await docClient.send(
        new ScanCommand({ TableName: "Notes" })
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      };
    } catch (error) {
      console.error("Error occurred:", error);
      return errorResponse(error);
    }
  }

  if (httpMethod === "POST" && rawPath === "/notes") {
    try {
      const note = JSON.parse(body);
      await docClient.send(new PutCommand({ TableName: "Notes", Item: note }));

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      };
    } catch (error) {
      console.error("Error occurred:", error);
      return errorResponse(error);
    }
  }

  if (httpMethod === "GET" && rawPath.match(/^\/notes\/\w+/)) {
    try {
      const id = rawPath.split("/")[2];

      const result = await docClient.send(
        new GetCommand({ TableName: "Notes", Key: { id } })
      );

      if (result.Item) {
        return {
          statusCode: 200,
          body: JSON.stringify(result.Item),
        };
      }

      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Note not found" }),
      };
    } catch (error) {
      console.error("Error occurred:", error);
      return errorResponse(error);
    }
  }

  if (httpMethod === "DELETE" && rawPath.match(/^\/notes\/\w+/)) {
    try {
      const id = rawPath.split("/")[2];

      const result = await docClient.send(
        new DeleteCommand({
          TableName: "Notes",
          Key: { id },
          ReturnValues: "ALL_OLD",
        })
      );

      if (!result.Attributes) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Note not found" }),
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Note deleted" }),
      };
    } catch (error) {
      console.error("Error occurred:", error);
      return errorResponse(error);
    }
  }

  return {
    statusCode: 400,

    body: JSON.stringify({ error: "Unsupported route" }),
  };
};
