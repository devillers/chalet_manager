import {createClient, type ClientConfig} from 'next-sanity'
import {apiVersion, dataset, projectId} from '../env'

const config: ClientConfig = {
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === 'production',
}

export const client = createClient(config)
