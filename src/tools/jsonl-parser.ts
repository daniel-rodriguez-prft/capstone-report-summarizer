import fs from 'fs'
import readline from 'readline';

export default async function parseJSONL(filePath: any) {
	const fileStream = fs.createReadStream(filePath);

	const readLine = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity // Recognizes both \r\n and \n correctly
	});
	let result = [];

	// Process the file line-by-line using an async iterator
	for await (const line of readLine) {
		if (!line.trim()) continue; // Skip empty lines

		try {

			result.push(line);
		} catch (error: any) {
			console.error('Error parsing line:', error.message);
		}
	}
	return result;
}