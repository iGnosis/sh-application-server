import { Injectable, StreamableFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Polly, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import * as fs from "fs/promises";
import { createReadStream } from 'fs';
import { join } from "path";

@Injectable()
export class PollyService {
  private pollyClient
  constructor(private configService: ConfigService) {
    const REGION = this.configService.get('AWS_DEFAULT_REGION');
    this.pollyClient = new Polly({ region: REGION });
  }

  async generateSpeech(text: string): Promise<StreamableFile> {
    const downloadsDir = join(process.cwd(), 'downloads')
    const fileName = this._cryb53(text).toString()
    const filePath = join(downloadsDir, fileName)

    const dirContents = await fs.readdir(downloadsDir)
    if (dirContents.includes(fileName)) {
      return this._createStreamableFile(filePath)
    }

    const params = {
      "Text": text,
      "VoiceId": "Joanna",
      "OutputFormat": "mp3",
      "Engine": "neural"
    }

    const command = new SynthesizeSpeechCommand(params)
    const audio = await this.pollyClient.send(command)

    if (audio.$metadata.httpStatusCode === 200) {
      await fs.writeFile(filePath, audio.AudioStream)
      return this._createStreamableFile(filePath)
    }

    console.log('some errors whilst using Polly')
    console.log(audio)
  }

  _createStreamableFile(filePath: string): StreamableFile {
    const file = createReadStream(filePath)
    return new StreamableFile(file)
  }

  // A quick hashing function for strings.
  // Credits where it's due: https://stackoverflow.com/a/52171480
  _cryb53(str: string, seed = 0): number {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i)
      h1 = Math.imul(h1 ^ ch, 2654435761)
      h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return 4294967296 * (2097151 & h2) + (h1 >>> 0)
  }
}