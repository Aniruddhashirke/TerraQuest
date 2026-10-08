import type { Discovery } from '../../db/database'

// Zero-shot CLIP: scores the photo against a nature-focused label list (plus non-nature "decoys"
// so a phone screen or a face is not forced into a species). Swap MODEL here if the id ever changes.
export const MODEL = 'Xenova/clip-vit-base-patch32'

type Cat = Discovery['category']
const group = (c: Cat, names: string) => names.split(',').map(n => [n.trim(), c] as [string, Cat])
const LABELS: [string, Cat][] = [
  ...group('bird', 'parrot,macaw,crow,sparrow,pigeon,peacock,kingfisher,eagle,owl,duck,heron,myna,hummingbird,seagull,flamingo,woodpecker,bulbul,egret,hawk,swan'),
  ...group('plant', 'rose,hibiscus,marigold,lotus,sunflower,daisy,jasmine,orchid,tulip,fern,grass,cactus,palm tree,banyan tree,mango tree,tulsi plant,green leaf,mushroom,moss,bamboo,flowering plant,tree trunk'),
  ...group('insect', 'butterfly,bee,ant,dragonfly,ladybug,beetle,grasshopper,moth,caterpillar,spider,wasp,mosquito'),
  ...group('other', 'dog,cat,squirrel,lizard,cow,fish,person,human face,phone screen,computer screen,building,car,indoor room,food,text document,sky,rock')
]

export interface Prediction { label: string; score: number; category: Cat; scientific?: string; notes?: string; via?: string }

let loader: Promise<any> | null = null
const load = () => {
  if (!loader) loader = import('@huggingface/transformers')
    .then(({ pipeline, env }) => { env.allowLocalModels = false; return pipeline('zero-shot-image-classification', MODEL) })
    .catch(e => { loader = null; throw e })
  return loader
}

export async function classify(dataUrl: string): Promise<Prediction[]> {
  const clf = await load()
  const out = await clf(dataUrl, LABELS.map(l => l[0]), { hypothesis_template: 'a photo of a {}' })
  return out.slice(0, 3).map((o: { label: string; score: number }) => ({
    label: o.label, score: o.score, category: LABELS.find(l => l[0] === o.label)![1]
  }))
}
