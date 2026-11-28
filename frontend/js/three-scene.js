
import * as THREE from "three";
import TWEEN from "three/addons/libs/tween.module.js";

import {
    CSS3DRenderer,
    CSS3DObject
} from "three/addons/renderers/CSS3DRenderer.js";

import {
    TrackballControls
} from "three/addons/controls/TrackballControls.js";


// =====================================
// CONFIGURATION
// =====================================

const TABLE_COLUMNS = 20;
const TABLE_ROWS = 10;

const TABLE_X_GAP = 140;
const TABLE_Y_GAP = 180;

const TRANSITION_DURATION = 2000;

const container = document.getElementById("scene-container");

let camera;
let scene;
let renderer;
let controls;
let activeLayout = "table";

const objects = [];

const targets = {
    table: [],
    sphere: [],
    helix: [],
    grid: [],
    tetrahedron: []
};

let currentLayout = "table";


// =====================================
// INITIALIZE
// =====================================

initializeScene();
animate();


function initializeScene() {

    camera = new THREE.PerspectiveCamera(
        40,
        window.innerWidth / window.innerHeight,
        1,
        10000
    );

    camera.position.z = 3000;

    scene = new THREE.Scene();

    renderer = new CSS3DRenderer();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.pointerEvents = "auto";
    renderer.domElement.style.touchAction = "none";

    container.appendChild(renderer.domElement);


    // =====================================
    // TRACKBALL CONTROLS
    // Match the official Three.js demo
    // =====================================

    controls = new TrackballControls(
        camera,
        renderer.domElement
    );

    controls.minDistance = 100;
    controls.maxDistance = 6000;

    controls.addEventListener("change", render);


    // =====================================
    // EVENTS
    // =====================================

    window.addEventListener("resize", onWindowResize);

    document.querySelectorAll(".layout-button").forEach(button => {

        button.addEventListener("click", () => {

            transform(
                button.dataset.layout,
                TRANSITION_DURATION
            );

        });

    });

}

// =====================================
// GET NET WORTH COLOR
// =====================================

function getNetWorthColor(netWorth) {

    // Convert values such as "$150K", "RM200,000", or "1.5M"
    let value = String(netWorth || "")
        .replace(/,/g, "")
        .replace(/[$RM\s]/gi, "")
        .toUpperCase();

    let multiplier = 1;

    if (value.endsWith("K")) {
        multiplier = 1000;
        value = value.slice(0, -1);
    } else if (value.endsWith("M")) {
        multiplier = 1000000;
        value = value.slice(0, -1);
    } else if (value.endsWith("B")) {
        multiplier = 1000000000;
        value = value.slice(0, -1);
    }

    const amount = parseFloat(value) * multiplier;

    if (isNaN(amount)) {
        return "#555555";
    }

    if (amount < 100000) {
        return "#ef3022";
    } else if (amount <= 200000) {
        return "#fdca35";
    } else {
        return "#3a9f48";
    }
}


// =====================================
// CREATE PROFILE TILE
// =====================================

function createProfileCard(profile) {

    const element = document.createElement("div");

    element.className = "element";


    // Country - top left

    const country = document.createElement("div");

    country.className = "country";
    country.textContent = profile.country || "-";

    element.appendChild(country);


    // Age - top right

    const age = document.createElement("div");

    age.className = "age";

    age.textContent = profile.age != null
        ? `${profile.age}`
        : "-";

    element.appendChild(age);


    // Profile photo

    const photo = document.createElement("img");

    photo.className = "photo";
    photo.src = profile.photo || "";
    photo.alt = profile.name || "Profile photo";
    photo.loading = "lazy";

    photo.onerror = () => {

        photo.removeAttribute("src");
        photo.alt = "No photo";

    };

    element.appendChild(photo);


    // Name

    const name = document.createElement("div");

    name.className = "name";
    name.textContent = profile.name || "Unknown";

    element.appendChild(name);


    // Interest

    const interest = document.createElement("div");

    interest.className = "interest";
    interest.textContent = profile.interest || "-";

    element.appendChild(interest);


    // Net Worth

    const netWorth = document.createElement("div");

    netWorth.className = "netWorth";
    netWorth.textContent = profile.netWorth || "-";

    const netWorthColor = getNetWorthColor(profile.netWorth);

    element.style.backgroundColor = `${netWorthColor}33`;
    element.style.borderColor = netWorthColor;

    element.style.boxShadow = `
        inset 0 0 35px ${netWorthColor}99,
        inset 0 0 20px ${netWorthColor}66,
        0 0 5px ${netWorthColor}66,
        0 0 10px ${netWorthColor}33
    `;

    return element;

}

// =====================================
// LOAD PROFILES FROM FASTAPI
// =====================================

async function loadProfiles() {

    controls.handleResize();

    render();

    const loading = document.getElementById("loading-message");

    loading.style.display = "block";
    loading.textContent = "Loading profiles...";

    try {

        const response = await fetch("/api/profiles", {
            credentials: "same-origin"
        });

        if (!response.ok) {

            if (response.status === 401) {
                throw new Error("Please login first.");
            }

            throw new Error("Unable to retrieve profiles.");

        }

        const data = await response.json();

        const profiles = Array.isArray(data)
            ? data
            : data.profiles;

        if (!Array.isArray(profiles) || profiles.length === 0) {

            loading.textContent = "No profiles found.";
            return;

        }


        // Maximum 200 profiles for 20 x 10 table

        if (profiles.length > TABLE_COLUMNS * TABLE_ROWS) {

            throw new Error(
                `Found ${profiles.length} profiles. ` +
                "The 20 x 10 Table layout supports up to 200 profiles."
            );

        }


        // Clear previous profiles

        TWEEN.removeAll();

        objects.forEach(object => {

            scene.remove(object);
            object.element.remove();

        });

        objects.length = 0;

        targets.table.length = 0;
        targets.sphere.length = 0;
        targets.helix.length = 0;
        targets.grid.length = 0;


        // Create profile tiles

        profiles.forEach(profile => {

            const element = createProfileCard(profile);

            const object = new CSS3DObject(element);

            object.position.x = Math.random() * 4000 - 2000;
            object.position.y = Math.random() * 4000 - 2000;
            object.position.z = Math.random() * 4000 - 2000;

            scene.add(object);

            objects.push(object);

        });


        // Generate layouts

        createTableTargets();
        createSphereTargets();
        createHelixTargets();
        createGridTargets();
        createTetrahedronTargets();

        loading.style.display = "none";


        // Start with Table layout

        transform("table", TRANSITION_DURATION);

        console.log(`${profiles.length} profiles loaded.`);

    } catch (error) {

        console.error("Profile loading error:", error);

        loading.textContent = error.message;

    }

}


// =====================================
// TABLE LAYOUT - 20 COLUMNS x 10 ROWS
// =====================================

function createTableTargets() {

    objects.forEach((object, index) => {

        const column = index % TABLE_COLUMNS;
        const row = Math.floor(index / TABLE_COLUMNS);

        const target = new THREE.Object3D();

        target.position.x =
            (column - (TABLE_COLUMNS - 1) / 2) * TABLE_X_GAP;

        target.position.y =
            ((TABLE_ROWS - 1) / 2 - row) * TABLE_Y_GAP;

        target.position.z = 0;

        targets.table.push(target);

    });

}


// =====================================
// SPHERE LAYOUT
// =====================================

function createSphereTargets() {

    const vector = new THREE.Vector3();

    const count = objects.length;

    objects.forEach((object, index) => {

        const phi = Math.acos(
            -1 + (2 * index) / count
        );

        const theta = Math.sqrt(count * Math.PI) * phi;

        const target = new THREE.Object3D();

        target.position.x =
            800 * Math.cos(theta) * Math.sin(phi);

        target.position.y =
            800 * Math.sin(theta) * Math.sin(phi);

        target.position.z =
            800 * Math.cos(phi);

        vector.copy(target.position).multiplyScalar(2);

        target.lookAt(vector);

        targets.sphere.push(target);

    });

}


// =====================================
// HELIX LAYOUT
// =====================================

function createHelixTargets() {

    const vector = new THREE.Vector3();

    const radius = 1000;
    const angleStep = 0.20;
    const verticalSpacing = 35;
    const strandOffset = Math.PI;

    const totalCards = objects.length;
    const cardsPerStrand = Math.ceil(totalCards / 2);

    targets.helix.length = 0;

    objects.forEach((object, index) => {

        // Assign cards to alternating strands
        const strand = index % 2;
        const strandIndex = Math.floor(index / 2);

        // Calculate spiral angle
        const angle =
            strandIndex * angleStep +
            strandOffset * strand;

        // Keep both strands vertically aligned
        const y =
            ((cardsPerStrand - 1) / 2 - strandIndex) *
            verticalSpacing;

        const target = new THREE.Object3D();

        target.position.set(
            radius * Math.cos(angle),
            y,
            radius * Math.sin(angle)
        );

        // Face cards outward
        vector.set(
            target.position.x * 2,
            target.position.y,
            target.position.z * 2
        );

        target.lookAt(vector);

        targets.helix.push(target);

    });

}

// =====================================
// GRID LAYOUT
// =====================================

function createGridTargets() {

    const columns = 5;
    const rows = 4;
    const layers = 10;

    const xSpacing = 200;
    const ySpacing = 200;
    const zSpacing = 750;

    targets.grid.length = 0;

    objects.forEach((object, index) => {

        const column = index % columns;
        const row = Math.floor(index / columns) % rows;
        const layer = Math.floor(index / (columns * rows));

        const target = new THREE.Object3D();

        target.position.set(
            (column - (columns - 1) / 2) * xSpacing,
            ((rows - 1) / 2 - row) * ySpacing,
            (layer - (layers - 1) / 2) * zSpacing
        );

        // Keep every profile card facing forward
        target.rotation.set(0, 0, 0);

        targets.grid.push(target);

    });

}

// =====================================
// TETRAHEDRON LAYOUT
// =====================================


function buildRowLengths(count) {
    let rows = 1;
    while ((rows * (rows + 1)) / 2 < count) rows++;
    const lengths = Array.from({ length: rows }, (_, i) => i + 1);
    let missing = (rows * (rows + 1)) / 2 - count;
    for (let i = rows - 1; missing > 0 && i >= 0; i--, missing--) lengths[i]--;
    return lengths;
}

function createTetrahedronTargets() {
    const totalCards = objects.length;

    // Match your actual card size
    const CARD_W = 120, CARD_H = 160, GAP = 20;

    const perFace = Math.floor(totalCards / 4);
    const extra = totalCards % 4;
    const maxCount = perFace + (extra ? 1 : 0);
    const rows = buildRowLengths(maxCount).length;

    // Equilateral lattice: row spacing comes from card height
    const S3 = Math.sqrt(3) / 2;
    const pitchY = CARD_H + GAP;
    const pitchX = pitchY / S3;

    // Size the tetrahedron so each face is exactly covered by the grid
    const faceH = (rows + 0.5) * pitchY;
    const edge = faceH / S3;
    const R = edge / Math.sqrt(8 / 3);        // apex distance from centre

    // Tetrahedron standing on a flat bottom face, apex up
    const baseY = -R / 3;
    const baseR = edge / Math.sqrt(3);
    const apex = new THREE.Vector3(0, R, 0);
    const base = [0, 1, 2].map(i => {
        const ang = (i * 2 * Math.PI) / 3;
        return new THREE.Vector3(baseR * Math.cos(ang), baseY, baseR * Math.sin(ang));
    });

    const faces = [
        [apex, base[0], base[1]],
        [apex, base[1], base[2]],
        [apex, base[2], base[0]],
        [base[0], base[2], base[1]]            // bottom
    ];

    targets.tetrahedron.length = 0;

    faces.forEach(([a, b, c], faceIndex) => {
        const count = perFace + (faceIndex < extra ? 1 : 0);
        if (count === 0) return;

        const center = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3);

        const normal = new THREE.Vector3()
            .crossVectors(
                new THREE.Vector3().subVectors(b, a),
                new THREE.Vector3().subVectors(c, a)
            ).normalize();
        if (normal.dot(center) < 0) normal.negate();

        const upDir = new THREE.Vector3().subVectors(a, center).normalize();
        const rightDir = new THREE.Vector3().crossVectors(upDir, normal).normalize();

        const rowLengths = buildRowLengths(count);

        rowLengths.forEach((rowLen, row) => {
            const d = (row + 0.75) * pitchY;   // distance down from the top corner
            for (let col = 0; col < rowLen; col++) {
                const x = (col - (rowLen - 1) / 2) * pitchX;

                const position = a.clone()
                    .addScaledVector(upDir, -d)
                    .addScaledVector(rightDir, x)
                    .addScaledVector(normal, 8);

                const target = new THREE.Object3D();
                target.position.copy(position);
                target.up.copy(upDir);
                target.lookAt(position.clone().add(normal));

                targets.tetrahedron.push(target);
            }
        });
    });

    console.log("Tetrahedron targets:", targets.tetrahedron.length, "/", totalCards);
}


// =====================================
// TRANSFORM BETWEEN LAYOUTS
// =====================================

function transform(layout, duration = TRANSITION_DURATION) {

    activeLayout = layout;

    if (!objects.length || !targets[layout]) return;

    currentLayout = layout;

    TWEEN.removeAll();

    const layoutTargets = targets[layout];

    objects.forEach((object, index) => {

        const target = layoutTargets[index];


        // Animate position

        new TWEEN.Tween(object.position)
            .to({
                x: target.position.x,
                y: target.position.y,
                z: target.position.z
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();


        // Animate rotation

        new TWEEN.Tween(object.rotation)
            .to({
                x: target.rotation.x,
                y: target.rotation.y,
                z: target.rotation.z
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

    });


    // Update active layout button

    document.querySelectorAll(".layout-button").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.layout === layout
        );

    });

}



// =====================================
// ANIMATION
// =====================================

function animate() {

    requestAnimationFrame(animate);

    TWEEN.update();

    controls.update();

    render();

}

// =====================================
// RENDER
// =====================================

function render() {

    renderer.render(scene, camera);

}


// =====================================
// WINDOW RESIZE
// =====================================

function onWindowResize() {

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    controls.handleResize();

    render();

}

//=====================================
// RESET CAMERA POSITION AND ROTATION
//=====================================

function resetPosition() {

    // Stop existing camera tweens
    TWEEN.removeAll();

    // Reset TrackballControls target
    controls.target.set(0, 0, 0);

    // Animate camera position
    new TWEEN.Tween(camera.position)
        .to({
            x: 0,
            y: 0,
            z: 3000
        }, 1500)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();

    // Animate camera up direction
    new TWEEN.Tween(camera.up)
        .to({
            x: 0,
            y: 1,
            z: 0
        }, 1500)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();

    // Update controls during animation
    controls.update();
}


document.getElementById("reset-view")
    .addEventListener("click", resetPosition);


// =====================================
// EXPOSE LOAD FUNCTION TO AUTH.JS
// =====================================

window.loadProfiles = loadProfiles;
