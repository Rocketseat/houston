import 'dotenv/config'
import { addVideos } from '../components/stores/qdrant'
import sample from './sample-data.json'

async function main() {
  await addVideos(sample)
}

main().then(() => {
  console.log('Loaded sample data.')
})
