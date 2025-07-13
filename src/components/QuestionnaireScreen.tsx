import React, { useState } from 'react';
import { QuestionnaireData } from '../types';
import { CheckCircle, User, Globe, Briefcase, MessageSquare } from 'lucide-react';

interface QuestionnaireScreenProps {
  onComplete: (data: QuestionnaireData) => void;
}

export const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState<QuestionnaireData>({
    movieWatchingFrequency: '',
    streamingServices: [],
    primaryStreamingService: '',
    movieGenrePreferences: [],
    attentionCheck: '',
    gender: '',
    ageRange: '',
    nationality: '',
    occupation: '',
    additionalComments: ''
  });

  const [errors, setErrors] = useState<string[]>([]);

  const movieFrequencyOptions = [
    'Daily',
    'Several times a week',
    'Once a week',
    'Several times a month',
    'Once a month',
    'Less than once a month',
    'Rarely'
  ];

  const streamingServiceOptions = [
    'Netflix',
    'Amazon Prime Video',
    'Disney+',
    'HBO Max',
    'Hulu',
    'Apple TV+',
    'Paramount+',
    'YouTube Premium',
    'Other',
    'None'
  ];

  const genreOptions = [
    'Action',
    'Adventure',
    'Animation',
    'Biography',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Family',
    'Fantasy',
    'Horror',
    'Musical',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'War',
    'Western'
  ];

  const ageRangeOptions = [
    'Under 18',
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55-64',
    '65 or older'
  ];

  const handleStreamingServiceChange = (service: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        streamingServices: [...prev.streamingServices, service]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        streamingServices: prev.streamingServices.filter(s => s !== service)
      }));
    }
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        movieGenrePreferences: [...prev.movieGenrePreferences, genre]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        movieGenrePreferences: prev.movieGenrePreferences.filter(g => g !== genre)
      }));
    }
  };

  const validateForm = () => {
    const newErrors: string[] = [];

    if (!formData.movieWatchingFrequency) {
      newErrors.push('Movie watching frequency is required');
    }

    if (formData.streamingServices.length === 0) {
      newErrors.push('At least one streaming service selection is required');
    }

    if (!formData.primaryStreamingService) {
      newErrors.push('Primary streaming service is required');
    }

    if (formData.movieGenrePreferences.length === 0) {
      newErrors.push('At least one movie genre preference is required');
    }

    if (!formData.attentionCheck) {
      newErrors.push('Please answer the attention check question');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onComplete(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-full mb-4">
            <CheckCircle size={32} className="text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Final Questionnaire</h1>
          <p className="text-gray-300">
            Please answer a few questions about your movie preferences and background
          </p>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-900 border border-red-500 rounded-lg p-4 mb-6">
            <h3 className="text-red-400 font-semibold mb-2">Please complete the following required fields:</h3>
            <ul className="text-red-300 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Mandatory Questions */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold text-white mb-6">Required Information</h2>
            
            {/* Movie Watching Frequency */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3">
                How often do you watch movies? *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {movieFrequencyOptions.map(option => (
                  <label key={option} className="flex items-center">
                    <input
                      type="radio"
                      name="movieFrequency"
                      value={option}
                      checked={formData.movieWatchingFrequency === option}
                      onChange={(e) => setFormData(prev => ({ ...prev, movieWatchingFrequency: e.target.value }))}
                      className="mr-3 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-gray-300">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Streaming Services */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3">
                Which streaming services do you use? (Select all that apply) *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {streamingServiceOptions.map(service => (
                  <label key={service} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.streamingServices.includes(service)}
                      onChange={(e) => handleStreamingServiceChange(service, e.target.checked)}
                      className="mr-3 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-gray-300">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Primary Streaming Service */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3">
                What is your primary streaming service? *
              </label>
              <select
                value={formData.primaryStreamingService}
                onChange={(e) => setFormData(prev => ({ ...prev, primaryStreamingService: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select your primary service</option>
                {streamingServiceOptions.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>

            {/* Attention Check */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3">
                Attention Check: Please select "Option C" for this question *
              </label>
              <select
                value={formData.attentionCheck}
                onChange={(e) => setFormData(prev => ({ ...prev, attentionCheck: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select an option</option>
                <option value="Option A">Option A</option>
                <option value="Option B">Option B</option>
                <option value="Option C">Option C</option>
                <option value="Option D">Option D</option>
              </select>
            </div>

            {/* Movie Genre Preferences */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3">
                What are your favorite movie genres? (Select all that apply) *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {genreOptions.map(genre => (
                  <label key={genre} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.movieGenrePreferences.includes(genre)}
                      onChange={(e) => handleGenreChange(genre, e.target.checked)}
                      className="mr-3 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-gray-300">{genre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Questions */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <User className="mr-2" size={24} />
              Optional Information
            </h2>
            
            {/* Gender */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3">Gender (Optional)</label>
              <select
                value={formData.gender || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Age Range */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3">Age Range (Optional)</label>
              <select
                value={formData.ageRange || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, ageRange: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select</option>
                {ageRangeOptions.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {/* Nationality */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3 flex items-center">
                <Globe className="mr-2" size={20} />
                Nationality (Optional)
              </label>
              <input
                type="text"
                value={formData.nationality || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                placeholder="e.g., American, British, etc."
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Occupation */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3 flex items-center">
                <Briefcase className="mr-2" size={20} />
                Occupation (Optional)
              </label>
              <input
                type="text"
                value={formData.occupation || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                placeholder="e.g., Student, Engineer, Teacher, etc."
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Additional Comments */}
            <div className="mb-6">
              <label className="block text-amber-400 font-medium mb-3 flex items-center">
                <MessageSquare className="mr-2" size={20} />
                Additional Comments (Optional)
              </label>
              <textarea
                value={formData.additionalComments || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalComments: e.target.value }))}
                placeholder="Any additional thoughts about the study or your movie preferences..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-vertical"
              />
            </div>
          </div>

          <div className="text-center">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
            >
              Complete Study
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};