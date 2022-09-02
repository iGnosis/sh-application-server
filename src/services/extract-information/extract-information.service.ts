import { Injectable } from '@nestjs/common';
import { PoseLandmark } from 'src/pose-data/pose-data.gateway';

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
  private getAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    const angle = (radians * 180) / Math.PI;
    if (angle > 180) {
      return 360 - angle;
    }
    return angle;
  }

  /**
   * get median of given elements
   * @param numbers array of numbers to calculate median
   * @param firstNNumbers If provided, will return the median of first N number of elements.
   * @returns median of the given elements
   */
  median(numbers: number[], firstNNumbers?: number): number {
    let sorted = Array.from(numbers).sort((a, b) => a + b);
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
        jointAngles[key] = this.getAngle(point1, point2, point3);
      }
    }
    return jointAngles;
  }
}
