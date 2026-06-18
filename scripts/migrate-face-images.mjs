// scripts/migrate-face-images.mjs
//
// Migra las fotos de clientes guardadas como base64 en `clients.image_url`
// hacia el bucket de Supabase Storage `clients`, y reemplaza la columna por
// la URL pública resultante.
//
// Uso:
//   node scripts/migrate-face-images.mjs --dry-run   (solo reporta, no escribe nada)
//   node scripts/migrate-face-images.mjs             (migra de verdad)
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
    if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '')
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.argv.includes('--dry-run')
const BUCKET = 'clients'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function dataUrlToBuffer(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/)
  if (!match) throw new Error('Formato base64 inválido')
  return { buffer: Buffer.from(match[2], 'base64'), contentType: match[1] }
}

async function migrate() {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, company_id, image_url')
    .like('image_url', 'data:%')

  if (error) throw new Error(error.message)

  console.log(`Encontrados ${clients.length} clientes con imagen base64 en DB.${DRY_RUN ? ' (dry-run, no se escribirá nada)' : ''}\n`)

  let migrated = 0
  let failed = 0

  for (const client of clients) {
    try {
      const { buffer, contentType } = dataUrlToBuffer(client.image_url)
      const ext = contentType.includes('png') ? 'png' : 'jpeg'
      const filePath = `${client.company_id}/${client.id}.${ext}`

      if (DRY_RUN) {
        console.log(`[dry-run] cliente ${client.id} (company ${client.company_id}) -> ${filePath} (${buffer.length} bytes)`)
        migrated++
        continue
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, buffer, { contentType, upsert: true })
      if (uploadError) throw new Error(`upload: ${uploadError.message}`)

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('clients')
        .update({ image_url: publicUrlData.publicUrl })
        .eq('id', client.id)
      if (updateError) throw new Error(`update: ${updateError.message}`)

      console.log(`✓ cliente ${client.id} -> ${publicUrlData.publicUrl}`)
      migrated++
    } catch (err) {
      failed++
      console.error(`✗ cliente ${client.id}: ${err.message}`)
    }
  }

  console.log(`\nTotal: ${clients.length}  Migrados: ${migrated}  Fallidos: ${failed}`)
}

migrate().catch(err => {
  console.error(err)
  process.exit(1)
})
