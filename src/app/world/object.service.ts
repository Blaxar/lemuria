import {Injectable} from '@angular/core'
import {HttpService} from './../network/http.service'
import {Group, Mesh, InstancedMesh, ConeGeometry, LoadingManager, MeshBasicMaterial, Texture, RepeatWrapping, 
  TextureLoader, MeshPhongMaterial, Object3D, Matrix4} from 'three'
import RWXLoader, {makeThreeMaterial} from 'three-rwx-loader'
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
    this.rwxLoader.setJSZip(JSZip, JSZipUtils).setFlatten(true)
  }

  setPath(path: string) {
    this.path = path
    this.rwxLoader.setPath(`${this.path}/rwx`).setResourcePath(`${this.path}/textures`)
  }

  loadAvatars() {
    return this.http.avatars(this.path)
  }

  applyTexture(item: Group, textureName: string = null, maskName: string = null, color: any = null) {
    item.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        const newMaterials = []
        child.material.forEach((m: MeshPhongMaterial) => {
          if (m.userData.rwx.material != null) {
            const newRWXMat = m.userData.rwx.material
            newRWXMat.texture = textureName
            newRWXMat.mask = maskName
            if (color != null) {
              newRWXMat.color = [color.r/255.0, color.g/255.0, color.b/255.0]
            }
            newMaterials.push(makeThreeMaterial(newRWXMat, `${this.path}/textures`, 'jpg', 'zip', JSZip, JSZipUtils).phongMat)
          }
          if (m.alphaMap != null) {
            m.alphaMap.dispose()
          }
          if (m.map != null) {
            m.map.dispose()
          }
          m.dispose()
        })
        child.material = newMaterials
        child.material.needsUpdate = true
      }
    })
  }

  loadTexture(name: string, loader: TextureLoader): any {
    let texture: Texture
    if (this.textures.get(name) !== undefined) {
      texture = this.textures.get(name)
    } else {
      texture = loader.load(`${this.path}/textures/${name}`)
      texture.wrapS = RepeatWrapping
      texture.wrapT = RepeatWrapping
      this.textures.set(name, texture)
    }
    const material = new MeshPhongMaterial({map: texture})
    material.needsUpdate = true
    return material
  }

  loadObject(name: string): Promise<any> {
    if (this.objects.get(name) !== undefined) {
      return this.objects.get(name)
    } else {
      const promise = new Promise((resolve, reject) => {
        this.rwxLoader.load(name, (rwx: Group) => resolve(rwx), null, () => resolve(this.errorCone))
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
    this.textures = new Map()
  }
}
