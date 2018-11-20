const zeroPos = new THREE.Vector3(0, 0, 0);
const zeroQuat = new THREE.Quaternion();
const oneScale = new THREE.Vector3(1, 1, 1);
const identity = new THREE.Matrix4();
identity.identity();
let updateMatrixCount = 0;
let updateMatrixWorldCount = 0;

AFRAME.registerSystem("world-update", {
  init() {
    this._patchRenderFunc();
    this._patchThreeJS();
    this.frame = 0;
  },

  _patchThreeJS: function() {
    //const frame = this.frame;

    const updateMatrix = THREE.Object3D.prototype.updateMatrix;
    THREE.Object3D.prototype.updateMatrix = function() {
      updateMatrix.apply(this, arguments);
      updateMatrixCount++;

      if (!this.matrixIsModified) {
        this.matrixIsModified = true;
      }
    };

    const applyMatrix = THREE.Object3D.prototype.applyMatrix;
    THREE.Object3D.prototype.applyMatrix = function() {
      applyMatrix.apply(this, arguments);

      if (!this.matrixIsModified) {
        this.matrixIsModified = true;
      }
    };

    // By the end of this function this.matrix reflects the updated local matrix
    // and this.worldMatrix reflects the updated world matrix, taking into account
    // parent matrices.
    //
    // Unless skipParents is true, all parent matricies are updated before
    // updating this object's local and world matrix.
    THREE.Object3D.prototype.updateMatrices = function(skipParents) {
      if (!this.hasHadFirstMatrixUpdate) {
        if (
          !this.position.equals(zeroPos) ||
          !this.quaternion.equals(zeroQuat) ||
          !this.scale.equals(oneScale) ||
          !this.matrix.equals(identity)
        ) {
          // Only update the matrix the first time if its non-identity, this way
          // this.matrixIsModified will remain false until the default
          // identity matrix is updated.
          this.updateMatrix();
        }

        this.hasHadFirstMatrixUpdate = true;
        this.cachedMatrixWorld = this.matrixWorld;
      } else if (this.matrixNeedsUpdate || this.matrixAutoUpdate) {
        this.updateMatrix();
        if (this.matrixNeedsUpdate) this.matrixNeedsUpdate = false;
      }

      if (this.parent === null) {
        this.matrixWorld.copy(this.matrix);
      } else {
        if (!skipParents) {
          this.parent.updateMatrices();
        }

        // If the matrix is unmodified, it is the identity matrix,
        // and hence we can use the parent's world matrix directly.
        //
        // Note this assumes all callers will either not pass skipParents=true
        // *or* will update the parent themselves beforehand as is done in
        // updateMatrixWorld.
        if (!this.matrixIsModified) {
          this.matrixWorld = this.parent.matrixWorld;
        } else {
          this.matrixWorld = this.cachedMatrixWorld;
          this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
          updateMatrixWorldCount++;
        }
      }

      return this.matrixWorld;
    };

    // Computes this object's matrices and then the recursively computes the matrices
    // of all the children.
    THREE.Object3D.prototype.updateMatrixWorld = function(force) {
      if (!this.visible && !force) return;

      this.updateMatrices(true); // Do not recurse upwards, since this is recursing downwards

      const children = this.children;

      for (let i = 0, l = children.length; i < l; i++) {
        children[i].updateMatrixWorld();
      }
    };
  },

  _patchRenderFunc: function() {
    const renderer = this.el.renderer;
    const render = renderer.render;

    renderer.render = (scene, camera, renderTarget) => {
      updateMatrixCount = 0;
      updateMatrixWorldCount = 0;
      scene.updateMatrixWorld(true, this.frame);
      if (this.frame % 120 === 0) {
        console.log(updateMatrixCount + " " + updateMatrixWorldCount);
      }

      render.call(renderer, scene, camera, renderTarget);
      this.frame++;
    };
  }
});
