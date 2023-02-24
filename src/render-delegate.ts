/**
 * Modified from original source https://github.com/autodesk-forks/USD/blob/gh-pages/usd_for_web_demos/ThreeJsRenderDelegate.js
 */

import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshPhysicalMaterial, RepeatWrapping, RGBAFormat, TextureLoader } from 'three';

declare global {
  interface Window { envMap: any; usdRoot: any; driver: any; }
}

class TextureRegistry {
  basename: any;
  textures: any;
  loader: any;

  constructor(basename: string, private driver: any) {
    this.basename = basename;
    this.textures = [];
    this.loader = new TextureLoader();
  }
  getTexture(filename: string) {
    if (this.textures[filename]) {
      return this.textures[filename];
    }

    let textureResolve: any, textureReject: any;
    this.textures[filename] = new Promise((resolve, reject) => {
      textureResolve = resolve;
      textureReject = reject;
    });

    let resourcePath = filename;
    if (filename[0] !== '/') {
      resourcePath = this.basename + '[' + filename +']';
    }

    let filetype: string;
    if (filename.indexOf('.png') >= filename.length - 5) {
      filetype = 'image/png';
    } else if (filename.indexOf('.jpg') >= filename.length - 5) {
      filetype = 'image/jpeg';
    } else if (filename.indexOf('.jpeg') >= filename.length - 5) {
      filetype = 'image/jpeg';
    } else {
      throw new Error('Unknown filetype');
    }

    this.driver.getFile(resourcePath, (loadedFile: any) => {
      if (!loadedFile) {
        textureReject(new Error('Unknown file: ' + resourcePath));
        return;
      }

      let blob = new Blob([loadedFile.slice(0)], {type: filetype});
      let blobUrl = URL.createObjectURL(blob);

      this.loader.load(
        blobUrl,
        (texture: any) => {
          textureResolve(texture);
        },
        undefined,
        (err: any) => {
          textureReject(err);
        }
      );
    });

    return this.textures[filename];
  }
}

class HydraMesh {
  _geometry: BufferGeometry;
  _id: any;
  _interface: any;
  _points: any;
  _normals: any;
  _colors: any;
  _uvs: any;
  _indices: any;
  _mesh: Mesh;

  constructor(id: any, hydraInterface: any, usdRoot: any) {
    this._geometry = new BufferGeometry();
    this._id = id;
    this._interface = hydraInterface;
    this._points = undefined;
    this._normals = undefined;
    this._colors = undefined;
    this._uvs = undefined;
    this._indices = undefined;

    const material = new MeshPhysicalMaterial( {
      side: DoubleSide,
      color: new Color(0x00ff00) // a green color to indicate a missing material
    } );

    this._mesh = new Mesh( this._geometry, material );
    this._mesh.castShadow = true;
    this._mesh.receiveShadow = true;
    
    usdRoot.add(this._mesh); // FIXME
  }

  updateOrder(attribute: any, attributeName: any, dimension = 3) {
    if (attribute && this._indices) {
      let values: any = [];
      for (let i = 0; i < this._indices.length; i++) {
        let index = this._indices[i]
        for (let j = 0; j < dimension; ++j) {
          values.push(attribute[dimension * index + j] as never);
        }
      }
      this._geometry.setAttribute( attributeName, new Float32BufferAttribute( values, dimension ) );
    }
  }

  updateIndices(indices: any) {
    this._indices = [];
    for (let i = 0; i< indices.length; i++) {
      this._indices.push(indices[i]);
    }
    //this._geometry.setIndex( indicesArray );
    this.updateOrder(this._points, 'position');
    this.updateOrder(this._normals, 'normal');
    if (this._colors) {
      this.updateOrder(this._colors, 'color');
    }
    if (this._uvs) {
      this.updateOrder(this._uvs, 'uv', 2);
      this._geometry.attributes.uv2 = this._geometry.attributes.uv;
    }
  }

  setTransform(matrix: any) {
    (this._mesh.matrix as any).set(...matrix);
    this._mesh.matrix.transpose();
    this._mesh.matrixAutoUpdate = false;
  }

  updateNormals(normals: any) {
    this._normals = normals.slice(0);
    this.updateOrder(this._normals, 'normal');
  }

  // This is always called before prims are updated
  setMaterial(materialId: any) {
    // console.log('Material: ' + materialId);
    if (this._interface.materials[materialId]) {
      this._mesh.material = this._interface.materials[materialId]._material;
    }
  }

  setDisplayColor(data: any, interpolation: any) {
    let wasDefaultMaterial = false;
    if (this._mesh.material === defaultMaterial) {
      this._mesh.material = (this._mesh.material as any).clone();
      wasDefaultMaterial = true;
    }

    this._colors = null;

    if (interpolation === 'constant') {
      (this._mesh.material as any).color = new Color().fromArray(data);
    } else if (interpolation === 'vertex') {
      // Per-vertex buffer attribute
      (this._mesh.material as any).vertexColors = true;
      if (wasDefaultMaterial) {
        // Reset the pink debugging color
        (this._mesh.material as any).color = new Color(0xffffff);
      }
      this._colors = data.slice(0);
      this.updateOrder(this._colors, 'color');
    } else {
      console.warn(`Unsupported displayColor interpolation type '${interpolation}'.`);
    }
  }

  setUV(data: any, dimension: any, interpolation: any) {
    // TODO: Support multiple UVs. For now, we simply set uv = uv2, which is required when a material has an aoMap.
    this._uvs = null;

    if (interpolation === 'facevarying') {
      // The UV buffer has already been prepared on the C++ side, so we just set it
      this._geometry.setAttribute('uv', new Float32BufferAttribute(data, dimension));
    } else if (interpolation === 'vertex') {
      // We have per-vertex UVs, so we need to sort them accordingly
      this._uvs = data.slice(0);
      this.updateOrder(this._uvs, 'uv', 2);
    }
    this._geometry.attributes.uv2 = this._geometry.attributes.uv;
  }

  updatePrimvar(name: any, data: any, dimension: any, interpolation: any) {
    if (name === 'points' || name === 'normals') {
      // Points and normals are set separately
      return;
    }

    // console.log('Setting PrimVar: ' + name);

    // TODO: Support multiple UVs. For now, we simply set uv = uv2, which is required when a material has an aoMap.
    if (name.startsWith('st')) {
      name = 'uv';
    }

    switch(name) {
      case 'displayColor':
        this.setDisplayColor(data, interpolation);
        break;
      case 'uv':
        this.setUV(data, dimension, interpolation);
        break;
      default:
        console.warn('Unsupported primvar', name);
    }
  }

  updatePoints(points: any) {
    this._points = points.slice(0);
    this.updateOrder(this._points, 'position');
  }

  commit() {
    // Nothing to do here. All Three.js resources are already updated during the sync phase.
  }

}

let defaultMaterial: any;

class HydraMaterial {
  // Maps USD preview material texture names to Three.js MeshPhysicalMaterial names
  static usdPreviewToMeshPhysicalTextureMap = {
    'diffuseColor': 'map',
    'clearcoat': 'clearcoatMap',
    'clearcoatRoughness': 'clearcoatRoughnessMap',
    'emissiveColor': 'emissiveMap',
    'occlusion': 'aoMap',
    'roughness': 'roughnessMap',
    'metallic': 'metalnessMap',
    'normal': 'normalMap',
    'opacity': 'alphaMap'
  };

  static channelMap = {
    // Three.js expects many 8bit values such as roughness or metallness in a specific RGB texture channel.
    // We could write code to combine multiple 8bit texture files into different channels of one RGB texture where it
    // makes sense, but that would complicate this loader a lot. Most Three.js loaders don't seem to do it either.
    // Instead, we simply provide the 8bit image as an RGB texture, even though this might be less efficient.
    'r': RGBAFormat,
    'rgb': RGBAFormat,
    'rgba': RGBAFormat
  };

  // Maps USD preview material property names to Three.js MeshPhysicalMaterial names
  static usdPreviewToMeshPhysicalMap = {
    'clearcoat': 'clearcoat',
    'clearcoatRoughness': 'clearcoatRoughness',
    'diffuseColor': 'color',
    'emissiveColor': 'emissive',
    'ior': 'ior',
    'metallic': 'metalness',
    'opacity': 'opacity',
    'roughness': 'roughness',
  };

  _id: any;
  _nodes: any;
  _interface: any;
  _material: any;

  constructor(id: any, hydraInterface: any) {
    this._id = id;
    this._nodes = {};
    this._interface = hydraInterface;
    if (!defaultMaterial) {
      defaultMaterial = new MeshPhysicalMaterial({
        side: DoubleSide,
        color: new Color(0xff2997), // a bright pink color to indicate a missing material
        envMap: window.envMap,
      });
    }
    this._material = defaultMaterial;
  }

  updateNode(_networkId: any, path: any, parameters: any) {
    // console.log('Updating Material Node: ' + networkId + ' ' + path);
    this._nodes[path] = parameters;
  }

  assignTexture(mainMaterial: any, parameterName: any) {
    const materialParameterMapName = (HydraMaterial as any).usdPreviewToMeshPhysicalTextureMap[parameterName];
    if (materialParameterMapName === undefined) {
      console.warn(`Unsupported material texture parameter '${parameterName}'.`);
      return;
    }
    if (mainMaterial[parameterName] && mainMaterial[parameterName].nodeIn) {
      const textureFileName = mainMaterial[parameterName].nodeIn.file;
      const channel = mainMaterial[parameterName].inputName;

      // For debugging
      // const matName = Object.keys(this._nodes).find(key => this._nodes[key] === mainMaterial);
      // console.log(`Setting texture '${materialParameterMapName}' (${textureFileName}) of material '${matName}'...`);

      this._interface.registry.getTexture(textureFileName).then((texture: any) => {
        if (materialParameterMapName === 'alphaMap') {
          // If this is an opacity map, check if it's using the alpha channel of the diffuse map.
          // If so, simply change the format of that diffuse map to RGBA and make the material transparent.
          // If not, we need to copy the alpha channel into a new texture's green channel, because that's what Three.js
          // expects for alpha maps (not supported at the moment).
          // NOTE that this only works if diffuse maps are always set before opacity maps, so the order of
          // 'assingTexture' calls for a material matters.
          if (textureFileName === mainMaterial.diffuseColor?.nodeIn?.file && channel === 'a') {
            this._material.map.format = RGBAFormat;
          } else {
            // TODO: Extract the alpha channel into a new RGB texture.
          }

          this._material.transparent = true;
          this._material.needsUpdate = true;
          return;
        } else if (materialParameterMapName === 'metalnessMap') {
          this._material.metalness = 1.0;
        } else if (materialParameterMapName === 'emissiveMap') {
          this._material.emissive = new Color(0xffffff);
        } else if (!(HydraMaterial as any).channelMap[channel]) {
          console.warn(`Unsupported texture channel '${channel}'!`);
          return;
        }

        // Clone texture and set the correct format.
        const clonedTexture = texture.clone();
        clonedTexture.format = (HydraMaterial as any).channelMap[channel];
        clonedTexture.needsUpdate = true;
        clonedTexture.wrapS = RepeatWrapping;
        clonedTexture.wrapT = RepeatWrapping;

        this._material[materialParameterMapName] = clonedTexture;

        this._material.needsUpdate = true;
      });
    } else {
      this._material[materialParameterMapName] = undefined;
    }
  }

  assignProperty(mainMaterial: any, parameterName: any) {
    const materialParameterName = (HydraMaterial as any).usdPreviewToMeshPhysicalMap[parameterName];
    if (materialParameterName === undefined) {
      console.warn(`Unsupported material parameter '${parameterName}'.`);
      return;
    }
    if (mainMaterial[parameterName] !== undefined && !mainMaterial[parameterName].nodeIn) {
      // console.log(`Assigning property ${parameterName}: ${mainMaterial[parameterName]}`);
      if (Array.isArray(mainMaterial[parameterName])) {
        this._material[materialParameterName] = new Color().fromArray(mainMaterial[parameterName]);
      } else {
        this._material[materialParameterName] = mainMaterial[parameterName];
        if (materialParameterName === 'opacity' && mainMaterial[parameterName] < 1.0) {
          this._material.transparent = true;
        }
      }
    }
  }

  updateFinished(_type: any, relationships: any) {
    for (let relationship of relationships) {
      relationship.nodeIn = this._nodes[relationship.inputId];
      relationship.nodeOut = this._nodes[relationship.outputId];
      relationship.nodeIn[relationship.inputName] = relationship;
      relationship.nodeOut[relationship.outputName] = relationship;
    }
    // console.log('Finalizing Material: ' + this._id);

    // find the main material node
    let mainMaterialNode = undefined;
    for (let node of Object.values(this._nodes) as any) {
      if (node.diffuseColor) {
        mainMaterialNode = node;
        break;
      }
    }

    if (!mainMaterialNode) {
      this._material = defaultMaterial;
      return;
    }

    // TODO: Ideally, we don't recreate the material on every update.
    // Creating a new one requires to also update any meshes that reference it. So we're relying on the C++ side to
    // call this before also calling `setMaterial` on the affected meshes.
    // console.log('Creating Material: ' + this._id);
    this._material = new MeshPhysicalMaterial({});

    // Assign textures
    for (let key in HydraMaterial.usdPreviewToMeshPhysicalTextureMap) {
      this.assignTexture(mainMaterialNode, key);
    }

    // Assign material properties
    for (let key in HydraMaterial.usdPreviewToMeshPhysicalMap) {
      this.assignProperty(mainMaterialNode, key);
    }

    if (window.envMap) {
      this._material.envMap = window.envMap;
    }

    // console.log(this._material);
  }
}

export class RenderDelegateInterface {
  meshes: any;
  registry: TextureRegistry;
  materials: any;
  driver: any;

  constructor(filename: any, Usd: any, private usdRoot: any) {
    this.materials = {};
    this.meshes = {};
    this.driver = new Usd.HdWebSyncDriver(this, filename);
    this.registry = new TextureRegistry(filename, this.driver);
  }

  createRPrim(_typeId: any, id: any) {
    // console.log('Creating RPrim: ' + typeId + ' ' + id);
    let mesh = new HydraMesh(id, this, this.usdRoot);
    this.meshes[id] = mesh;
    return mesh;
  }

  createBPrim(_typeId: any, _id: any) {
    // console.log('Creating BPrim: ' + typeId + ' ' + id);
    /*let mesh = new HydraMesh(id, this);
    this.meshes[id] = mesh;
    return mesh;*/
  }

  createSPrim(typeId: any, id: any) {
    // console.log('Creating SPrim: ' + typeId + ' ' + id);

    if (typeId === 'material') {
      let material = new HydraMaterial(id, this);
      this.materials[id] = material;
      return material;
    } else {
      return undefined;
    }
  }

  CommitResources() {
    for (const id in this.meshes) {
        const hydraMesh = this.meshes[id]
        hydraMesh.commit();
    }
  }
}