import React, { useState } from 'react';
import './Search.css';
import PromoImg from '../../img/icons/123.jpg';
import sportImg1 from '../../img/icons/1.jpg';
import sportImg2 from '../../img/icons/2.jpg';
import sportImg3 from '../../img/icons/3.jpg';
import sportImg4 from '../../img/icons/4.jpg';
import sportImg5 from '../../img/icons/5.jpg';
import sportImg6 from '../../img/icons/6.jpg';
import sportImg7 from '../../img/icons/7.jpg';
import sportImg8 from '../../img/icons/8.jpg';

const workouts = [
  {
    id: 1,
    name: 'Кардио-тренировки',
    description: 'Улучшите выносливость и сожгите калории с помощью наших кардио-программ.',
    info: 'Бег, велотренажёр, эллипс, степпер — занятия для развития выносливости сердца и лёгких. Рекомендуемая частота: 3–4 раза в неделю по 30–45 минут. Подходит для любого уровня подготовки.',
    image: sportImg3,
  },
  {
    id: 2,
    name: 'Силовые тренировки',
    description: 'Нарастите мышечную массу и увеличьте силу под руководством опытных тренеров.',
    info: 'Работа с отягощениями, тренажёры и свободные веса. Индивидуальные программы для набора массы или рельефа. Занятия в малых группах и персонально. Контроль техники и прогресса.',
    image: sportImg8,
  },
  {
    id: 3,
    name: 'Йога и растяжка',
    description: 'Расслабьтесь, улучшите гибкость и обретите гармонию с нашими занятиями йогой.',
    info: 'Хатха, стретчинг, пилатес. Улучшение осанки, снятие напряжения, развитие гибкости. Занятия утром и вечером. Не требуют специальной подготовки.',
    image: sportImg7,
  },
  {
    id: 4,
    name: 'Функциональные тренировки',
    description: 'Развивайте силу, гибкость и координацию для повседневной жизни.',
    info: 'Упражнения, имитирующие естественные движения: приседания, выпады, тяги, отжимания. Тренировка всего тела, развитие координации и выносливости. Подходит для тех, кто хочет быть в форме в быту и на работе.',
    image: sportImg5,
  },
  {
    id: 5,
    name: 'Гимнастика',
    description: 'Развивайте координацию, гибкость и силу с помощью гимнастических элементов.',
    info: 'Общая физическая подготовка, элементы на кольцах, брусьях, перекладине. Укрепление корпуса, развитие баланса и ловкости. Группы для детей и взрослых, разный уровень сложности.',
    image: sportImg2,
  },
  {
    id: 6,
    name: 'Пилатес',
    description: 'Укрепляйте мышцы кора и улучшайте осанку на занятиях пилатесом.',
    info: 'Система упражнений на коврике и на тренажёрах реформер. Фокус на глубоких мышцах, дыхании и плавности движений. Восстановление после нагрузок, профилактика травм. Подходит для любого возраста.',
    image: sportImg6,
  },
  {
    id: 7,
    name: 'Кроссфит',
    description: 'Высокоинтенсивные тренировки для развития силы и выносливости.',
    info: 'Комплексы из силовых и кардио-упражнений: тяги, приседания, бёрпи, работа с гирями и гантелями. Тренировки в группе, атмосфера соревнования. Рекомендуется средний уровень подготовки. Занятия с тренером.',
    image: sportImg1,
  },
  {
    id: 8,
    name: 'Аквааэробика',
    description: 'Тренировки в воде: снижение нагрузки на суставы при высокой эффективности.',
    info: 'Упражнения в бассейне под музыку: кардио, силовые элементы с оборудованием (нудлы, пояса, гантели для воды). Идеально для восстановления, при проблемах с суставами и для беременных. Не требуется умение плавать. Занятия в группах.',
    image: sportImg4,
  },
];

const Search = () => {
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  return (
    <section className="search">
      <div className="container search_container">
        <div className="content">
          <div className="content_text">TEXT</div>
          <div className="content_img search_img_wrap">
            <img src={PromoImg} alt="Promo" />
            <div className="search_workouts search_workouts_overlay">
              <h2 className="search_workouts_title">Доступные направления тренировок</h2>
              <div className="search_workouts_grid">
                {workouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="search_workout_card"
                    onClick={() => setSelectedWorkout(workout)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedWorkout(workout)}
                  >
                    <div className="search_workout_img_wrap">
                      <img src={workout.image} alt={workout.name} className="search_workout_img" />
                    </div>
                    <h3 className="search_workout_name">{workout.name}</h3>
                    <p className="search_workout_desc">{workout.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedWorkout && (
        <div
          className="search_info_overlay"
          onClick={() => setSelectedWorkout(null)}
          role="presentation"
        >
          <div
            className="search_info_modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="search_info_close"
              onClick={() => setSelectedWorkout(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <div className="search_info_img_wrap">
              <img src={selectedWorkout.image} alt={selectedWorkout.name} className="search_info_img" />
            </div>
            <h3 className="search_info_title">{selectedWorkout.name}</h3>
            <p className="search_info_desc">{selectedWorkout.description}</p>
            <p className="search_info_details">{selectedWorkout.info}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default Search;