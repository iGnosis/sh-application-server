import { Injectable } from '@nestjs/common';
import { PoseLandmark } from 'src/types/global';

@Injectable()
export class ExtractInformationService {
  private joints: {
    [key: string]: [number, number, number];
  } = {
    leftShoulderElbowWrist: [11, 13, 15],
    rightShoulderElbowWrist: [12, 14, 16],
    leftElbowShoulderHip: [13, 11, 23],
    righElbowtShoulderHip: [24, 12, 14],
    rightShoulderHipKnee: [12, 24, 26],
    leftShoulderHipKnee: [11, 23, 25],
    righHiptKneeAnkle: [24, 26, 28],
    leftHipKneeAnkle: [23, 25, 27],
  };

  /**
   * get angle between two vectors
   * @returns angle between the given points
   */
  private get2dAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    const angle = (radians * 180) / Math.PI;
    if (angle > 180) {
      return 360 - angle;
    }
    return angle;
  }

  /**
   * Calculate angle between 3 points in 3D space.
   * Note: assumes we want 1 vector to run from coord1 -> coord2, and the other
   * from coord3 -> coord2.
   *
   * https://youtu.be/ECNH_1TTOjs <-- A YouTube video which explains the calcualtions.
   *
   * @param {x: number; y: number; z: number} coord1 1st (3D) coordinate
   * @param {x: number; y: number; z: number} coord2 2nd (3D) coordinate
   * @param {x: number; y: number; z: number} coord3 3rd (3D) coordinate
   *
   * @return {number} Angle between the 3 points
   */
  private get3dAngle(coord1: PoseLandmark, coord2: PoseLandmark, coord3: PoseLandmark): number {
    // Calculate vector between points 1 and 2
    const v1 = {
      x: coord1.x - coord2.x,
      y: coord1.y - coord2.y,
      z: coord1.z - coord2.z,
    };

    // Calculate vector between points 2 and 3
    const v2 = {
      x: coord3.x - coord2.x,
      y: coord3.y - coord2.y,
      z: coord3.z - coord2.z,
    };

    // The dot product of vectors v1 & v2 is a function of the cosine of the
    // angle between them (it's scaled by the product of their magnitudes).

    // Normalize v1 - convert it to a unit vector.
    const v1mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const v1norm = {
      x: v1.x / v1mag,
      y: v1.y / v1mag,
      z: v1.z / v1mag,
    };

    // Normalize v2 - convert it to a unit vector.
    const v2mag = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
    const v2norm = {
      x: v2.x / v2mag,
      y: v2.y / v2mag,
      z: v2.z / v2mag,
    };

    // Calculate the dot products of vectors v1 and v2
    const dotProducts = v1norm.x * v2norm.x + v1norm.y * v2norm.y + v1norm.z * v2norm.z;

    // Extract the angle from the dot products
    const angle = (Math.acos(dotProducts) * 180.0) / Math.PI;

    // Round result to 3 decimal points and return
    return Math.round(angle * 1000) / 1000;
  }

  /**
   * get median of given elements
   * @param numbers array of numbers to calculate median
   * @param firstNNumbers If provided, will return the median of first N number of elements.
   * @returns median of the given elements
   */
  median(numbers: number[], firstNNumbers?: number): number {
    let sorted = Array.from(numbers).sort((a, b) => a - b);
    if (firstNNumbers) {
      sorted = Array.from(numbers)
        .sort((a, b) => a + b)
        .slice(0, firstNNumbers);
    }
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }

  extractJointAngles(poseLandmarks: PoseLandmark[]): { [key: string]: number } {
    const jointAngles: { [key: string]: number } = {};
    for (const [key, joint] of Object.entries(this.joints)) {
      const point1 = poseLandmarks[joint[0]];
      const point2 = poseLandmarks[joint[1]];
      const point3 = poseLandmarks[joint[2]];
      if (point1 && point2 && point2) {
        jointAngles[`${key}2D`] = this.get2dAngle(point1, point2, point3);
        jointAngles[`${key}3D`] = this.get3dAngle(point1, point2, point3);
      }
    }
    return jointAngles;
  }
}
