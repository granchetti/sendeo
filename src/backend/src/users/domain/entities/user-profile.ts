
import { Email } from '../../../shared/domain/value-objects/email-value-object';
import { Age } from '../value-objects/age-value-object';
import { DistanceUnit } from '../value-objects/distance-unit-value-object';

export interface UserProfileProps {
  email: Email;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  age?: Age;
  unit?: DistanceUnit;
}

export class UserProfile {
  private constructor(private props: UserProfileProps) {}

  static create(props: UserProfileProps): UserProfile {
    return new UserProfile(props);
  }

  static fromPrimitives(obj: {
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    age?: number;
    unit?: string;
  }): UserProfile {
    return new UserProfile({
      email: Email.fromString(obj.email),
      firstName: obj.firstName,
      lastName: obj.lastName,
      displayName: obj.displayName,
      age: obj.age != null ? Age.fromNumber(obj.age) : undefined,
      unit: obj.unit != null ? DistanceUnit.fromString(obj.unit) : undefined,
    });
  }

  toPrimitives(): {
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    age?: number;
    unit?: string;
  } {
    return {
      email: this.props.email.Value,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      displayName: this.props.displayName,
      age: this.props.age?.Value,
      unit: this.props.unit?.Value,
    };
  }

  get email(): Email {
    return this.props.email;
  }
  get firstName(): string | undefined {
    return this.props.firstName;
  }
  get lastName(): string | undefined {
    return this.props.lastName;
  }
  get displayName(): string | undefined {
    return this.props.displayName;
  }
  get age(): Age | undefined {
    return this.props.age;
  }
  get unit(): DistanceUnit | undefined {
    return this.props.unit;
  }
}
