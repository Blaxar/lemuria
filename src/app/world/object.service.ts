import {Injectable} from '@angular/core'
import {HttpService} from './../network/http.service'
import RWXLoader from 'three-rwx-loader'
import {Group, Mesh, InstancedMesh, ConeGeometry, LoadingManager, MeshBasicMaterial, RepeatWrapping, TextureLoader, Matrix4} from 'three'
import * as JSZip from 'jszip'
import JSZipUtils from 'jszip-utils'

export class InstancedObject {

  private original: Mesh // Original instance of the loaded object.
  instanced: InstancedMesh // InstancedMesh for the object, allows for efficient spawning of multiple instances
  private globalToLocalIdMap = new Map<number, number>()
  private availableSlots = new Set<number>() // Maybe use a queue?
  private counter : number = 0
  private maxCount : number

  name: string
  date: any
  desc: string
  act: string

  added = false

  constructor( object: Mesh, count: number) {
    this.original = object
    this.instanced = new InstancedMesh(this.original.geometry, this.original.material, count)
    this.maxCount = count
    this.instanced.count = 0
  }

  // Spawn a new instance of this type
  add(id: number, transform: Matrix4): boolean {
    // If there's at least one available slot, we reuse it before anything else
    if(this.availableSlots.size > 0) {
      const availableID = this.availableSlots.keys()[0]
      this.instanced.setMatrixAt(availableID, transform);
      this.instanced.instanceMatrix.needsUpdate = true;
      this.availableSlots.delete(availableID);

      return true;
    }

    // If the maximum number of instances has been reached: we cannot add more
    if(this.counter >= this.maxCount)
      return false;

    this.globalToLocalIdMap.set(id, this.counter)
    this.instanced.setMatrixAt(this.counter++, transform);
    this.instanced.count = this.counter;

    return true;
  }

  // Update an existing instance of this type
  update(id: number, transform: Matrix4): boolean {
    // If there's no object with de provided id: we cannot do anything
    if(!this.globalToLocalIdMap.has(id))
      return false;

    const localId = this.globalToLocalIdMap.get(id)

    this.instanced.setMatrixAt(localId, transform);

    return true;
  }

  // Remove an exitsing object of this type
  remove(id: number): boolean {
    // If there's no object with de provided id: we cannot do anything
    if(!this.globalToLocalIdMap.has(id))
      return false;

    const localId = this.globalToLocalIdMap.get(id)
    let transform: Matrix4 = new Matrix4()

    // By filling the transformation matrix with zeros: we disable this instance
    transform.set(0, 0, 0, 0,
                  0, 0, 0, 0,
                  0, 0, 0, 0,
                  0, 0, 0, 0);
    this.instanced.setMatrixAt(localId, transform);
    this.instanced.instanceMatrix.needsUpdate = true;

    this.globalToLocalIdMap.delete(localId)

    return true;
  }
}

@Injectable({providedIn: 'root'})
export class ObjectService {

  private errorCone: Group
  private rwxLoader = new RWXLoader(new LoadingManager())
  private objects: Map<string, Promise<any>> = new Map()
  private instancedObjects: Map<string, Promise<any>> = new Map()
  private textures: Map<string, any> = new Map()
  private path = 'http://localhost'
  private defaultCount: number = 4096

  constructor(private http: HttpService) {
    const cone = new Mesh(new ConeGeometry(0.5, 0.5, 3), new MeshBasicMaterial({color: 0x000000}))
    cone.position.y = 0.5
    this.errorCone = new Group().add(cone)
    this.rwxLoader.setJSZip(JSZip, JSZipUtils).setFlatten(true).setWaitFullLoad(true);
  }

  setPath(path: string) {
    this.path = path
    this.rwxLoader.setPath(`${this.path}/rwx`).setResourcePath(`${this.path}/textures`)
  }

  loadAvatars() {
    return this.http.avatars(this.path)
  }

  loadTexture(name: string, loader: TextureLoader): any {
    if (this.textures.get(name) !== undefined) {
      return this.textures.get(name)
    } else {
      const texture = loader.load(`${this.path}/textures/${name}`)
      texture.wrapS = RepeatWrapping
      texture.wrapT = RepeatWrapping
      const material = new MeshBasicMaterial({map: texture})
      material.needsUpdate = true
      this.textures.set(name, material)
      return material
    }
  }

  loadObject(name: string): Promise<any> {
    if (this.objects.get(name) !== undefined) {
      return this.objects.get(name)
    } else {
      const promise = new Promise((resolve, reject) => {
        this.rwxLoader.load(name, (rwx: Mesh) => resolve(rwx), null, () => resolve(this.errorCone))
      })
      this.objects.set(name, promise)
      return promise
    }
  }

  loadInstancedObject(name: string): Promise<any> {
    if (this.instancedObjects.get(name) !== undefined) {
      return this.instancedObjects.get(name)
    } else {
      const promise = new Promise((resolve, reject) => {
        this.rwxLoader.load(name, (rwx: Mesh) => resolve(new InstancedObject(rwx, this.defaultCount)))
      })
      this.instancedObjects.set(name, promise)
      return promise
    }
  }

  cleanCache() {
    this.objects = new Map()
    this.instancedObjects = new Map()
    this.textures = new Map()
  }
}
