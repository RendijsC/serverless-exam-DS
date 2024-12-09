import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", JSON.stringify(event));

    const { role, movieId } = event.pathParameters || {};
    const nameSubstring = event.queryStringParameters?.name;

    if (!role || !movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Role and Movie ID are required." }),
      };
    }

    const queryInput: QueryCommandInput = {
      TableName: process.env.MOVIE_CREW_TABLE_NAME,
      KeyConditionExpression: "movieId = :m and crewRole = :r",
      ExpressionAttributeValues: {
        ":m": parseInt(movieId),
        ":r": role,
      },
    };

    const queryOutput = await ddbDocClient.send(new QueryCommand(queryInput));

    let results = queryOutput.Items || [];

    if (nameSubstring) {
        const lowercaseSubstring = nameSubstring.toLowerCase();
        results = results.map((item: any) => {
          const filteredNames = item.names
            .split(",")
            .map((name: string) => name.trim())
            .filter((name: string) => name.toLowerCase().includes(lowercaseSubstring));
          return { ...item, names: filteredNames };
        });
  
        results = results.filter((item: any) => item.names.length > 0);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: results }),
    };
  } catch (error: any) {
    console.error("Error: ", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
